import { ref, update } from 'firebase/database'
import { resolveTurn } from './battle.js'
import { buildFighterById } from './fighters.js'
import { database } from './firebase.js'
import { playerList } from './rooms.js'

// O confronto dentro de uma sala.
//
// Quem decide é sempre o anfitrião: ele sorteia os Pokémon, monta os lutadores
// e resolve cada rodada, escrevendo o resultado na sala. Os outros aparelhos só
// mandam a própria escolha e mostram o que chega. Assim duas pessoas nunca
// calculam a mesma rodada e chegam a resultados diferentes.
//
// Isso não impede trapaça: o anfitrião poderia alterar o próprio navegador.
// Para impedir de verdade, o cálculo teria de rodar num servidor (uma Cloud
// Function), o que fica para depois.

export const ROSTER_SIZE = 3
export const DRAFT_SECONDS = 30
export const PREVIEW_SECONDS = 15
export const TURN_SECONDS = 15

function sorteia(lista, quantidade) {
  const copia = [...lista]
  const escolhidos = []
  while (copia.length && escolhidos.length < quantidade) {
    escolhidos.push(copia.splice(Math.floor(Math.random() * copia.length), 1)[0])
  }
  return escolhidos
}

// Sorteia os Pokémon de cada jogador e abre a fase de escolha.
export function startDraft({ code, room, catalog }) {
  const players = playerList(room)
  const roster = {}

  for (const player of players) {
    roster[player.id] = sorteia(catalog, ROSTER_SIZE).map((entry) => entry.id)
  }

  return update(ref(database, `rooms/${code}`), {
    status: 'draft',
    phaseEndsAt: Date.now() + DRAFT_SECONDS * 1000,
    roster,
    picks: null,
    match: null,
  })
}

export function setPick({ code, playerId, pokemonId }) {
  return update(ref(database, `rooms/${code}/picks`), { [playerId]: pokemonId })
}

export function everyonePicked(room) {
  const players = playerList(room)
  return players.length > 0 && players.every((player) => room.picks?.[player.id])
}

// Monta os dois lutadores e abre os 15 segundos de comparação.
// Quem não escolheu a tempo entra com o primeiro Pokémon que recebeu.
export async function startPreview({ code, room, signal }) {
  const players = playerList(room)
  const fighters = {}

  await Promise.all(players.map(async (player) => {
    const escolhido = room.picks?.[player.id] || room.roster?.[player.id]?.[0]
    const fighter = await buildFighterById(escolhido, signal)
    fighters[player.id] = { ...fighter, master: player.masterName || 'Mestre sem nome' }
  }))

  return update(ref(database, `rooms/${code}`), {
    status: 'preview',
    phaseEndsAt: Date.now() + PREVIEW_SECONDS * 1000,
    match: {
      fighters,
      round: 1,
      moves: null,
      log: null,
      winner: null,
    },
  })
}

export function startBattle({ code }) {
  return update(ref(database, `rooms/${code}`), {
    status: 'battle',
    phaseEndsAt: Date.now() + TURN_SECONDS * 1000,
  })
}

export function submitMove({ code, playerId, moveId }) {
  return update(ref(database, `rooms/${code}/match/moves`), { [playerId]: moveId })
}

export function everyoneMoved(room) {
  const players = playerList(room)
  return players.length > 0 && players.every((player) => room.match?.moves?.[player.id])
}

function findMove(fighter, moveId) {
  return fighter.moves?.find((move) => move.id === moveId) || null
}

// Resolve uma rodada e grava o resultado. Só o anfitrião chama isto.
export function applyTurn({ code, room }) {
  const players = playerList(room)
  const [first, second] = players
  const match = room.match
  if (!match || !first || !second) return Promise.resolve()

  const fighterA = match.fighters[first.id]
  const fighterB = match.fighters[second.id]

  const result = resolveTurn({
    player: fighterA,
    opponent: fighterB,
    playerMove: findMove(fighterA, match.moves?.[first.id]),
    opponentMove: findMove(fighterB, match.moves?.[second.id]),
  })

  const log = [...(match.log || []), { round: match.round, events: result.events }]
  const acabou = Boolean(result.winner)

  const winner = result.winner === 'player'
    ? first.id
    : result.winner === 'opponent'
      ? second.id
      : result.winner === 'draw'
        ? 'draw'
        : null

  return update(ref(database, `rooms/${code}`), {
    status: acabou ? 'finished' : 'battle',
    phaseEndsAt: acabou ? null : Date.now() + TURN_SECONDS * 1000,
    'match/fighters': { [first.id]: result.player, [second.id]: result.opponent },
    'match/round': acabou ? match.round : match.round + 1,
    'match/moves': null,
    'match/log': log,
    'match/winner': winner,
  })
}

// Devolve o confronto do ponto de vista de quem está olhando.
export function matchView(room, playerId) {
  const match = room?.match
  if (!match) return null

  const players = playerList(room)
  const outro = players.find((player) => player.id !== playerId)

  return {
    me: match.fighters?.[playerId] || null,
    rival: outro ? match.fighters?.[outro.id] || null : null,
    rivalName: outro?.masterName || 'Rival',
    round: match.round || 1,
    log: match.log || [],
    myMove: match.moves?.[playerId] || null,
    winner: match.winner || null,
    iWon: match.winner === playerId,
  }
}
