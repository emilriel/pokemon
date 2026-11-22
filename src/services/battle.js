import typeChartData from '../data/typeChart.json'

// Motor da batalha.
//
// A PokeAPI entrega os atributos, os golpes e a tabela de tipos, mas não calcula
// dano nem decide vencedor. Este arquivo faz essa parte, seguindo a fórmula dos
// jogos, simplificada: todos os Pokémon lutam no nível 50, para ser justo.
//
// Nada aqui mexe na tela. A ideia é que a mesma função sirva depois para uma
// partida entre duas pessoas, quando a batalha passar a acontecer no servidor.

const LEVEL = 50
// A fórmula dos jogos deixa a luta curta demais aqui: uma vantagem de quatro
// vezes derruba de primeira e o confronto acaba em um golpe. Para o torneio
// render mais rodadas, o dano sai reduzido e nenhum golpe passa de uma fatia
// da vida do alvo, então são precisos pelo menos três acertos.
const DAMAGE_SCALE = 0.6
const MAX_DAMAGE_SHARE = 0.32
const MOVES_PER_POKEMON = 4
const MOVE_CANDIDATES = 14

const typeChart = typeChartData.chart

// Golpe de reserva, para quando um Pokémon não tem nenhum golpe de dano na API
// (acontece com formas alternativas, como as Gmax e as Mega). Ele sai no tipo
// do próprio Pokémon: assim rende o bônus de tipo igual e raramente cai em uma
// combinação que não causa dano nenhum.
function fallbackMove(types) {
  return {
    id: 'investida',
    name: 'Investida',
    power: 50,
    accuracy: 100,
    type: types[0] || 'normal',
    damageClass: 'physical',
  }
}

const moveNames = {
  physical: 'físico',
  special: 'especial',
}

function statAt(base) {
  return base + 5
}

function hpAt(base) {
  return base + 60
}

function titleCase(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function pickRandom(list, count) {
  const copy = [...list]
  const picked = []

  while (copy.length && picked.length < count) {
    picked.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0])
  }

  return picked
}

// Quanto o tipo do golpe rende contra os tipos do defensor (2, 1, 0,5 ou 0).
export function effectivenessAgainst(moveType, defenderTypes) {
  return defenderTypes.reduce(
    (total, defenderType) => total * (typeChart[moveType]?.[defenderType] ?? 1),
    1,
  )
}

export function describeEffectiveness(multiplier) {
  if (multiplier === 0) return 'Não afeta o alvo.'
  if (multiplier >= 2) return 'Muito eficaz!'
  if (multiplier < 1) return 'Pouco eficaz.'
  return ''
}

// Transforma o Pokémon da API em um lutador: atributos no nível 50 e vida cheia.
export function createFighter(pokemon, moves) {
  const stats = Object.fromEntries(
    pokemon.stats.map(({ base_stat: value, stat }) => [stat.name, value]),
  )
  const maxHP = hpAt(stats.hp ?? 1)
  const types = pokemon.types.map(({ type }) => type.name)

  return {
    id: pokemon.id,
    name: pokemon.name,
    label: titleCase(pokemon.name),
    types,
    image: pokemon.sprites.other['official-artwork'].front_default
      || pokemon.sprites.front_default,
    maxHP,
    currentHP: maxHP,
    attack: statAt(stats.attack ?? 1),
    defense: statAt(stats.defense ?? 1),
    specialAttack: statAt(stats['special-attack'] ?? 1),
    specialDefense: statAt(stats['special-defense'] ?? 1),
    speed: statAt(stats.speed ?? 1),
    moves: moves.length ? moves : [fallbackMove(types)],
  }
}

// Escolhe quais golpes do Pokémon entram na luta.
//
// A API lista tudo o que a espécie pode aprender em todos os jogos (o Pikachu
// tem 110). Ficamos com os aprendidos por nível e sorteamos alguns candidatos,
// porque cada golpe exige uma consulta à API.
export function pickMoveCandidates(pokemon) {
  const byLevel = pokemon.moves.filter(({ version_group_details: details }) =>
    details.some(({ move_learn_method: method }) => method.name === 'level-up'),
  )
  const pool = byLevel.length ? byLevel : pokemon.moves

  return pickRandom(pool, MOVE_CANDIDATES).map(({ move }) => move.name)
}

// Mantém só os golpes que causam dano (os de status vêm com power nulo).
export function toBattleMoves(moveDetails) {
  const damaging = moveDetails
    .filter((move) => move && move.power && move.damage_class?.name !== 'status')
    .map((move) => ({
      id: move.name,
      name: titleCase(move.name),
      power: move.power,
      accuracy: move.accuracy,
      type: move.type.name,
      damageClass: move.damage_class.name,
    }))

  // Sem repetir o mesmo golpe duas vezes.
  const unique = []
  for (const move of damaging) {
    if (!unique.some((item) => item.id === move.id)) unique.push(move)
    if (unique.length === MOVES_PER_POKEMON) break
  }

  return unique
}

export function moveClassLabel(damageClass) {
  return moveNames[damageClass] || damageClass
}

// A fórmula dos jogos, simplificada, no nível 50.
export function calculateDamage(attacker, defender, move, roll = Math.random()) {
  const isPhysical = move.damageClass === 'physical'
  const attackStat = isPhysical ? attacker.attack : attacker.specialAttack
  const defenseStat = isPhysical ? defender.defense : defender.specialDefense

  const base = Math.floor(((2 * LEVEL) / 5 + 2) * move.power * (attackStat / defenseStat) / 50) + 2
  const stab = attacker.types.includes(move.type) ? 1.5 : 1
  const effectiveness = effectivenessAgainst(move.type, defender.types)
  const variation = 0.85 + roll * 0.15

  const bruto = base * stab * effectiveness * variation * DAMAGE_SCALE
  const teto = defender.maxHP * MAX_DAMAGE_SHARE
  const damage = Math.floor(Math.min(bruto, teto))

  return {
    damage: effectiveness === 0 ? 0 : Math.max(1, damage),
    effectiveness,
  }
}

export function moveHits(move, roll = Math.random()) {
  // accuracy nulo significa golpe que nunca erra.
  if (move.accuracy === null || move.accuracy === undefined) return true
  return roll * 100 < move.accuracy
}

// Resolve uma rodada inteira e devolve os lutadores atualizados e o que aconteceu.
//
// Cada lado manda o golpe escolhido, ou null se o tempo acabou antes da escolha:
// nesse caso aquele lado perde a vez e só o outro ataca.
export function resolveTurn({ player, opponent, playerMove, opponentMove, random = Math.random }) {
  const fighters = {
    player: { ...player },
    opponent: { ...opponent },
  }
  const moves = { player: playerMove, opponent: opponentMove }
  const events = []

  if (!playerMove) events.push({ kind: 'timeout', side: 'player', text: `${player.label} hesitou e perdeu a vez.` })
  if (!opponentMove) events.push({ kind: 'timeout', side: 'opponent', text: `${opponent.label} hesitou e perdeu a vez.` })

  // Mais rápido ataca primeiro; empate decide no sorteio.
  const order = fighters.player.speed === fighters.opponent.speed
    ? (random() < 0.5 ? ['player', 'opponent'] : ['opponent', 'player'])
    : (fighters.player.speed > fighters.opponent.speed ? ['player', 'opponent'] : ['opponent', 'player'])

  for (const side of order) {
    const move = moves[side]
    if (!move) continue

    const attacker = fighters[side]
    const defenderSide = side === 'player' ? 'opponent' : 'player'
    const defender = fighters[defenderSide]

    if (attacker.currentHP <= 0 || defender.currentHP <= 0) continue

    if (!moveHits(move, random())) {
      events.push({ kind: 'miss', side, text: `${attacker.label} usou ${move.name}, mas errou.` })
      continue
    }

    const { damage, effectiveness } = calculateDamage(attacker, defender, move, random())
    defender.currentHP = Math.max(0, defender.currentHP - damage)

    events.push({
      kind: 'hit',
      side,
      move: move.name,
      damage,
      effectiveness,
      text: `${attacker.label} usou ${move.name} e tirou ${damage} de vida.`,
      note: describeEffectiveness(effectiveness),
    })

    if (defender.currentHP === 0) {
      events.push({ kind: 'faint', side: defenderSide, text: `${defender.label} não aguentou e caiu.` })
      break
    }
  }

  const playerDown = fighters.player.currentHP === 0
  const opponentDown = fighters.opponent.currentHP === 0

  return {
    player: fighters.player,
    opponent: fighters.opponent,
    events,
    winner: playerDown && opponentDown ? 'draw' : playerDown ? 'opponent' : opponentDown ? 'player' : null,
  }
}

// Joga a luta inteira sozinha, para confrontos em que ninguém está no comando
// (dois treinadores do computador). Devolve os dois ao final e quem venceu.
export function simulateMatch(fighterA, fighterB, maxTurns = 60) {
  let a = { ...fighterA }
  let b = { ...fighterB }
  const events = []

  for (let turn = 0; turn < maxTurns; turn += 1) {
    const result = resolveTurn({
      player: a,
      opponent: b,
      playerMove: chooseMoveForComputer(a, b),
      opponentMove: chooseMoveForComputer(b, a),
    })

    a = result.player
    b = result.opponent
    events.push(...result.events)

    if (result.winner) return { a, b, winner: result.winner, events }
  }

  // Empate por tempo: ganha quem estiver com mais vida.
  const winner = a.currentHP === b.currentHP ? 'draw' : a.currentHP > b.currentHP ? 'player' : 'opponent'
  return { a, b, winner, events }
}

// Escolha do computador: prefere o golpe que mais machuca neste confronto.
// Erra de propósito de vez em quando, para não ficar impossível de vencer.
export function chooseMoveForComputer(attacker, defender, random = Math.random) {
  if (!attacker.moves.length) return null
  if (random() < 0.25) return attacker.moves[Math.floor(random() * attacker.moves.length)]

  return attacker.moves.reduce((best, move) => {
    const { damage } = calculateDamage(attacker, defender, move, 0.5)
    const bestDamage = best ? calculateDamage(attacker, defender, best, 0.5).damage : -1
    return damage > bestDamage ? move : best
  }, null)
}
