import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  update,
} from 'firebase/database'
import { database } from './firebase.js'

// Salas de batalha no Realtime Database.
//
// Formato de uma sala, guardada em rooms/{codigo}:
//   gymName      nome do ginásio, escolhido por quem criou
//   maxPlayers   de 2 a 8, sempre par
//   hostId       identificador de quem criou
//   status       'lobby' | 'naming' | 'ready'
//   phaseEndsAt  quando a fase atual termina (só nas fases com relógio)
//   players/{id} cada jogador: nome do mestre, se já se declarou pronto, se é
//                o anfitrião e quando entrou
//
// Não há login: cada aparelho gera um identificador próprio e o guarda no
// navegador. Isso basta para a sala saber quem é quem.

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 8
export const NAMING_SECONDS = 60

const PLAYER_KEY = 'pokedex:playerId'
const CODE_LENGTH = 6
const CODE_ATTEMPTS = 8
const TIMEOUT_MS = 10000

// O Firebase fica tentando reconectar para sempre e nunca devolve erro. Sem um
// limite de tempo, o botão ficaria girando sem explicação para quem está sem
// internet ou com o servidor fora do ar.
function withTimeout(promise, message) {
  let timeoutId
  const limit = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), TIMEOUT_MS)
  })

  return Promise.race([promise, limit]).finally(() => clearTimeout(timeoutId))
}

const OFFLINE = 'Sem conexão com o servidor das salas. Verifique sua internet e tente de novo.'

export function getPlayerId() {
  try {
    const saved = window.localStorage.getItem(PLAYER_KEY)
    if (saved) return saved

    const created = `p${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(PLAYER_KEY, created)
    return created
  } catch {
    // Navegador sem armazenamento (aba anônima bloqueada): vale para esta visita.
    return `p${Math.random().toString(36).slice(2, 10)}`
  }
}

function randomCode() {
  return String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

export function isValidCode(code) {
  return /^\d{6}$/.test(code)
}

export function isValidPlayerCount(count) {
  return count >= MIN_PLAYERS && count <= MAX_PLAYERS && count % 2 === 0
}

export function roomLink(code) {
  return `${window.location.origin}${window.location.pathname}#/sala/${code}`
}

// Lê o código da sala quando alguém abre o site pelo QR Code.
export function codeFromLocation() {
  const match = window.location.hash.match(/#\/sala\/(\d{6})/)
  return match ? match[1] : null
}

export function clearRoomFromLocation() {
  if (window.location.hash) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

// Cria a sala com um código livre. A transação garante que dois aparelhos não
// fiquem com o mesmo código, mesmo criando ao mesmo tempo.
export async function createRoom({ gymName, maxPlayers, playerId }) {
  if (!isValidPlayerCount(maxPlayers)) {
    throw new Error('O número de jogadores precisa ser par, de 2 a 8.')
  }

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = randomCode()
    const roomRef = ref(database, `rooms/${code}`)

    const result = await withTimeout(runTransaction(roomRef, (current) => {
      if (current) return undefined // código ocupado: a transação desiste

      return {
        gymName: gymName.trim() || 'Ginásio sem nome',
        maxPlayers,
        hostId: playerId,
        status: 'lobby',
        createdAt: serverTimestamp(),
        players: {
          [playerId]: { isHost: true, masterName: '', ready: false, joinedAt: serverTimestamp() },
        },
      }
    }), OFFLINE)

    if (result.committed) return code
  }

  throw new Error('Não foi possível gerar um código livre. Tente de novo.')
}

export async function joinRoom({ code, playerId }) {
  const roomRef = ref(database, `rooms/${code}`)
  const snapshot = await withTimeout(get(roomRef), OFFLINE)

  if (!snapshot.exists()) throw new Error('Não achamos nenhuma sala com esse código.')

  const room = snapshot.val()
  const players = room.players || {}

  if (players[playerId]) return code // já estava nela, por exemplo após recarregar
  if (room.status !== 'lobby') throw new Error('Essa batalha já começou.')
  if (Object.keys(players).length >= room.maxPlayers) throw new Error('Essa sala já está cheia.')

  await withTimeout(update(ref(database, `rooms/${code}/players/${playerId}`), {
    isHost: false,
    masterName: '',
    ready: false,
    joinedAt: serverTimestamp(),
  }), OFFLINE)

  return code
}

// Acompanha a sala em tempo real. Devolve a função que encerra a escuta.
export function watchRoom(code, onChange, onError) {
  return onValue(
    ref(database, `rooms/${code}`),
    (snapshot) => onChange(snapshot.exists() ? snapshot.val() : null),
    (error) => onError?.(error),
  )
}

// Tira o jogador da sala se o aparelho fechar ou perder a conexão.
export function releaseOnDisconnect(code, playerId) {
  const playerRef = ref(database, `rooms/${code}/players/${playerId}`)
  onDisconnect(playerRef).remove()
  return () => onDisconnect(playerRef).cancel()
}

export async function leaveRoom({ code, playerId, isHost }) {
  // Sem anfitrião a sala não anda, então ela some junto.
  if (isHost) {
    await remove(ref(database, `rooms/${code}`))
    return
  }

  await remove(ref(database, `rooms/${code}/players/${playerId}`))
}

export function setMasterName({ code, playerId, masterName }) {
  return update(ref(database, `rooms/${code}/players/${playerId}`), {
    masterName: masterName.trim().slice(0, 20),
  })
}

// O jogador avisa que terminou. Quando todos avisam, a fase fecha sem esperar
// o minuto inteiro.
export function setReady({ code, playerId, masterName, ready }) {
  return update(ref(database, `rooms/${code}/players/${playerId}`), {
    masterName: masterName.trim().slice(0, 20),
    ready,
  })
}

// O anfitrião abre o minuto em que todos escrevem o nome do mestre.
export function startNaming(code) {
  return update(ref(database, `rooms/${code}`), {
    status: 'naming',
    phaseEndsAt: Date.now() + NAMING_SECONDS * 1000,
  })
}

// Preenche as vagas que sobraram com treinadores do computador, para a sala
// começar mesmo sem gente suficiente. Eles já entram prontos.
export function fillWithBots({ code, room }) {
  const atuais = playerList(room)
  const faltam = room.maxPlayers - atuais.length
  if (faltam <= 0) return Promise.resolve()

  const novos = {}
  for (let i = 0; i < faltam; i += 1) {
    novos[`bot${i + 1}`] = {
      isHost: false,
      isBot: true,
      masterName: `Treinador IA ${i + 1}`,
      ready: true,
      joinedAt: Date.now() + i,
    }
  }

  return update(ref(database, `rooms/${code}/players`), novos)
}

export function everyoneReady(room) {
  const players = humanPlayers(room)
  return players.length > 0 && players.every((player) => player.ready)
}

export function finishNaming(code) {
  return update(ref(database, `rooms/${code}`), { status: 'ready', phaseEndsAt: null })
}

export function playerList(room) {
  return Object.entries(room?.players || {})
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
}

export function humanPlayers(room) {
  return playerList(room).filter((player) => !player.isBot)
}
