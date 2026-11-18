import { ref, update } from 'firebase/database'
import { chooseMoveForComputer, createFighter, resolveTurn, simulateMatch } from './battle.js'
import { buildFighterById } from './fighters.js'
import { database } from './firebase.js'
import { fetchPokemonDetails } from './pokeApi.js'
import { playerList } from './rooms.js'

// O torneio dentro de uma sala.
//
// Quem decide é sempre o anfitrião: ele sorteia os times, monta os confrontos,
// joga pelos treinadores do computador e resolve cada rodada, escrevendo o
// resultado na sala. Os outros aparelhos mandam a própria escolha e mostram o
// que chega. Assim duas pessoas nunca calculam a mesma rodada e chegam a
// resultados diferentes.
//
// Isso não impede trapaça: o anfitrião poderia alterar o próprio navegador.
// Para impedir de verdade, o cálculo teria de rodar num servidor.
//
// Os confrontos acontecem um de cada vez, e quem não está lutando assiste.
// A vida não se recupera entre as fases: um Pokémon machucado chega assim na
// fase seguinte, e por isso cada jogador recebe um time de três.

export const TEAM_SIZE = 3
export const PICK_SECONDS = 30
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

function embaralha(lista) {
  return sorteia(lista, lista.length)
}

export function formaPares(ids) {
  const pares = []
  for (let i = 0; i < ids.length; i += 2) {
    pares.push({ a: ids[i], b: ids[i + 1] || null, winner: ids[i + 1] ? null : ids[i] })
  }
  return pares
}

export function nomeDaFase(round, totalRounds) {
  const faltam = totalRounds - round
  if (faltam === 0) return 'Final'
  if (faltam === 1) return 'Semifinal'
  if (faltam === 2) return 'Quartas de final'
  return `${round}ª fase`
}

// Monta os times: três Pokémon por jogador, só com atributos. Os golpes entram
// depois, quando o Pokémon é escolhido para um confronto, para não pedir
// centenas de consultas à API de uma vez.
export async function startTournament({ code, room, catalog, signal }) {
  const players = playerList(room)
  const ids = players.flatMap(() => sorteia(catalog, TEAM_SIZE).map((entry) => entry.id))
  const detalhes = await fetchPokemonDetails(ids.map((id) => ({ name: String(id) })), signal)

  const teams = {}
  players.forEach((player, index) => {
    teams[player.id] = detalhes
      .slice(index * TEAM_SIZE, (index + 1) * TEAM_SIZE)
      .map((pokemon) => createFighter(pokemon, []))
  })

  const ordem = embaralha(players.map((player) => player.id))
  const totalRounds = Math.ceil(Math.log2(Math.max(ordem.length, 2)))

  return update(ref(database, `rooms/${code}`), {
    status: 'pick',
    phaseEndsAt: Date.now() + PICK_SECONDS * 1000,
    teams,
    picks: null,
    match: null,
    champion: null,
    bracket: { round: 1, totalRounds, current: 0, pairs: formaPares(ordem) },
  })
}

export function currentPair(room) {
  const bracket = room?.bracket
  if (!bracket) return null
  return bracket.pairs?.[bracket.current] || null
}

export function isFighting(room, playerId) {
  const pair = currentPair(room)
  return Boolean(pair && (pair.a === playerId || pair.b === playerId))
}

function membrosVivos(room, playerId) {
  return (room.teams?.[playerId] || []).filter((member) => member.currentHP > 0)
}

export function setPick({ code, playerId, index }) {
  return update(ref(database, `rooms/${code}/picks`), { [playerId]: index })
}

// Escolha do computador: manda o que tiver mais vida.
function escolhaDoComputador(room, playerId) {
  const time = room.teams?.[playerId] || []
  let melhor = 0
  time.forEach((member, index) => {
    if (member.currentHP > (time[melhor]?.currentHP ?? -1)) melhor = index
  })
  return melhor
}

export function pairReadyToFight(room, players) {
  const pair = currentPair(room)
  if (!pair?.a || !pair?.b) return false

  return [pair.a, pair.b].every((id) => {
    const player = players.find((item) => item.id === id)
    return player?.isBot || room.picks?.[id] !== undefined
  })
}

// Monta os dois lutadores do confronto atual, já com golpes, e abre a
// comparação de 15 segundos. Dois treinadores do computador resolvem na hora.
export async function startMatch({ code, room, players, signal }) {
  const pair = currentPair(room)
  if (!pair?.a || !pair?.b) return null

  const escolhidos = {}
  for (const id of [pair.a, pair.b]) {
    const player = players.find((item) => item.id === id)
    const vivos = membrosVivos(room, id)
    const indicePedido = player?.isBot ? escolhaDoComputador(room, id) : room.picks?.[id]
    const time = room.teams?.[id] || []
    const pedido = time[indicePedido]
    escolhidos[id] = pedido && pedido.currentHP > 0 ? indicePedido : time.indexOf(vivos[0] || time[0])
  }

  const fighters = {}
  await Promise.all([pair.a, pair.b].map(async (id) => {
    const base = room.teams[id][escolhidos[id]]
    const completo = await buildFighterById(base.id, signal)
    const player = players.find((item) => item.id === id)
    fighters[id] = {
      ...completo,
      currentHP: base.currentHP,
      teamIndex: escolhidos[id],
      master: player?.masterName || 'Treinador',
    }
  }))

  const aBot = players.find((item) => item.id === pair.a)?.isBot
  const bBot = players.find((item) => item.id === pair.b)?.isBot

  // Sem ninguém no comando, a luta acontece de uma vez.
  if (aBot && bBot) {
    const resultado = simulateMatch(fighters[pair.a], fighters[pair.b])
    const vencedor = resultado.winner === 'player' ? pair.a : pair.b
    return finishMatch({
      code,
      room,
      pair,
      fighters: { [pair.a]: resultado.a, [pair.b]: resultado.b },
      winner: vencedor,
      log: [{ round: 1, events: resultado.events.slice(-4) }],
    })
  }

  return update(ref(database, `rooms/${code}`), {
    status: 'preview',
    phaseEndsAt: Date.now() + PREVIEW_SECONDS * 1000,
    match: { fighters, round: 1, moves: null, log: null, winner: null },
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

export function combatantsMoved(room, players) {
  const pair = currentPair(room)
  if (!pair?.a || !pair?.b) return false

  return [pair.a, pair.b].every((id) => {
    const player = players.find((item) => item.id === id)
    return player?.isBot || room.match?.moves?.[id]
  })
}

function achaGolpe(fighter, moveId) {
  return fighter?.moves?.find((move) => move.id === moveId) || null
}

// Guarda a vida de quem lutou, marca o vencedor e segue para o próximo
// confronto, a próxima fase ou o fim do torneio.
function finishMatch({ code, room, pair, fighters, winner, log }) {
  const bracket = room.bracket
  const pairs = bracket.pairs.map((item, index) => (
    index === bracket.current ? { ...item, winner } : item
  ))

  const mudancas = {
    'match/fighters': fighters,
    'match/winner': winner,
    'match/log': log,
    'match/moves': null,
    'bracket/pairs': pairs,
  }

  // A vida machucada volta para o time, para a próxima fase.
  for (const id of [pair.a, pair.b]) {
    const indice = fighters[id]?.teamIndex
    if (indice === undefined) continue
    mudancas[`teams/${id}/${indice}/currentHP`] = fighters[id].currentHP
  }

  const faltamNaFase = pairs.slice(bracket.current + 1).some((item) => item.b)
  const vencedores = pairs.map((item) => item.winner).filter(Boolean)

  if (faltamNaFase) {
    mudancas.status = 'roundEnd'
    mudancas.phaseEndsAt = Date.now() + 4000
  } else if (vencedores.length === 1 && pairs.length === 1) {
    mudancas.status = 'finished'
    mudancas.phaseEndsAt = null
    mudancas.champion = vencedores[0]
  } else {
    mudancas.status = 'roundEnd'
    mudancas.phaseEndsAt = Date.now() + 4000
  }

  return update(ref(database, `rooms/${code}`), mudancas)
}

// Resolve uma rodada do confronto atual.
export function applyTurn({ code, room, players }) {
  const pair = currentPair(room)
  const match = room.match
  if (!match || !pair?.a || !pair?.b) return Promise.resolve()

  const fighterA = match.fighters[pair.a]
  const fighterB = match.fighters[pair.b]
  const aBot = players.find((item) => item.id === pair.a)?.isBot
  const bBot = players.find((item) => item.id === pair.b)?.isBot

  const result = resolveTurn({
    player: fighterA,
    opponent: fighterB,
    playerMove: aBot ? chooseMoveForComputer(fighterA, fighterB) : achaGolpe(fighterA, match.moves?.[pair.a]),
    opponentMove: bBot ? chooseMoveForComputer(fighterB, fighterA) : achaGolpe(fighterB, match.moves?.[pair.b]),
  })

  const log = [...(match.log || []), { round: match.round, events: result.events }]
  const fighters = { [pair.a]: result.player, [pair.b]: result.opponent }

  if (!result.winner) {
    return update(ref(database, `rooms/${code}`), {
      status: 'battle',
      phaseEndsAt: Date.now() + TURN_SECONDS * 1000,
      'match/fighters': fighters,
      'match/round': match.round + 1,
      'match/moves': null,
      'match/log': log,
    })
  }

  const winner = result.winner === 'player' ? pair.a : result.winner === 'opponent' ? pair.b : pair.a
  return finishMatch({ code, room, pair, fighters, winner, log })
}

// Passa para o próximo confronto ou monta a próxima fase.
export function nextMatch({ code, room }) {
  const bracket = room.bracket
  const restantes = bracket.pairs.slice(bracket.current + 1).findIndex((item) => item.b)

  if (restantes >= 0) {
    return update(ref(database, `rooms/${code}`), {
      status: 'pick',
      phaseEndsAt: Date.now() + PICK_SECONDS * 1000,
      picks: null,
      'bracket/current': bracket.current + 1 + restantes,
    })
  }

  const vencedores = bracket.pairs.map((item) => item.winner).filter(Boolean)

  if (vencedores.length <= 1) {
    return update(ref(database, `rooms/${code}`), {
      status: 'finished',
      phaseEndsAt: null,
      champion: vencedores[0] || null,
    })
  }

  return update(ref(database, `rooms/${code}`), {
    status: 'pick',
    phaseEndsAt: Date.now() + PICK_SECONDS * 1000,
    picks: null,
    match: null,
    bracket: {
      round: bracket.round + 1,
      totalRounds: bracket.totalRounds,
      current: 0,
      pairs: formaPares(embaralha(vencedores)),
    },
  })
}

// O confronto atual do ponto de vista de quem está olhando.
export function matchView(room, playerId, players) {
  const match = room?.match
  const pair = currentPair(room)
  if (!match || !pair) return null

  const sou = pair.a === playerId ? pair.a : pair.b === playerId ? pair.b : null
  const euLuto = Boolean(sou)
  const ladoA = euLuto ? sou : pair.a
  const ladoB = euLuto ? (sou === pair.a ? pair.b : pair.a) : pair.b

  const nome = (id) => players.find((item) => item.id === id)?.masterName || 'Treinador'

  return {
    euLuto,
    me: match.fighters?.[ladoA] || null,
    rival: match.fighters?.[ladoB] || null,
    meName: nome(ladoA),
    rivalName: nome(ladoB),
    round: match.round || 1,
    log: match.log || [],
    myMove: euLuto ? match.moves?.[playerId] || null : null,
    winner: match.winner || null,
    iWon: match.winner === playerId,
    winnerName: match.winner ? nome(match.winner) : null,
  }
}
