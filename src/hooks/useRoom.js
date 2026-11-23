import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyTurn,
  combatantsMoved,
  currentPair,
  isFighting,
  matchView,
  nextMatch,
  pairReadyToFight,
  setPick,
  setTurbo,
  somenteBots,
  resolveAuto,
  startBattle,
  startMatch,
  startTournament,
  submitMove,
} from '../services/match.js'
import {
  clearRoomFromLocation,
  codeFromLocation,
  createRoom,
  everyoneReady,
  fillWithBots,
  finishNaming,
  getPlayerId,
  humanPlayers,
  joinRoom,
  leaveRoom,
  playerList,
  releaseOnDisconnect,
  setMasterName,
  setReady,
  startNaming,
  watchRoom,
} from '../services/rooms.js'

export default function useRoom(catalog = []) {
  const [playerId] = useState(getPlayerId)
  const [code, setCode] = useState(null)
  const [room, setRoom] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(null)
  const stopWatching = useRef(null)
  const cancelDisconnect = useRef(null)
  // Evita que o anfitrião dispare a mesma passagem de fase duas vezes: a sala
  // muda várias vezes por segundo e os efeitos rodam a cada mudança.
  const phaseLock = useRef('')
  const phaseRequest = useRef(null)

  const players = playerList(room)
  const me = players.find((player) => player.id === playerId) || null
  const isHost = Boolean(me?.isHost)

  const detach = useCallback(() => {
    stopWatching.current?.()
    cancelDisconnect.current?.()
    stopWatching.current = null
    cancelDisconnect.current = null
  }, [])

  const attach = useCallback((roomCode) => {
    detach()
    setCode(roomCode)
    cancelDisconnect.current = releaseOnDisconnect(roomCode, playerId)
    stopWatching.current = watchRoom(
      roomCode,
      (value) => {
        // A sala sumiu: o anfitrião saiu ou ela foi encerrada.
        if (!value) {
          detach()
          setRoom(null)
          setCode(null)
          setError('A sala foi encerrada.')
          return
        }
        setRoom(value)
      },
      () => setError('Perdemos a conexão com a sala.'),
    )
  }, [detach, playerId])

  useEffect(() => detach, [detach])
  useEffect(() => () => phaseRequest.current?.abort(), [])

  // Quem abre o site pelo QR Code chega com o código no endereço.
  useEffect(() => {
    const fromLink = codeFromLocation()
    if (!fromLink) return

    clearRoomFromLocation()
    setIsBusy(true)
    joinRoom({ code: fromLink, playerId })
      .then((joined) => attach(joined))
      .catch((joinError) => setError(joinError.message))
      .finally(() => setIsBusy(false))
  }, [attach, playerId])

  // Relógio das fases com tempo.
  useEffect(() => {
    if (!room?.phaseEndsAt) {
      setSecondsLeft(null)
      return undefined
    }

    function tick() {
      setSecondsLeft(Math.max(0, Math.ceil((room.phaseEndsAt - Date.now()) / 1000)))
    }

    tick()
    const intervalId = window.setInterval(tick, 500)
    return () => window.clearInterval(intervalId)
  }, [room?.phaseEndsAt])

  // Daqui para baixo, só o anfitrião escreve: ele sorteia, monta os lutadores,
  // joga pelos treinadores do computador e resolve cada rodada.
  const advance = useCallback(async (key, action) => {
    if (phaseLock.current === key) return
    phaseLock.current = key
    try {
      await action()
    } catch (phaseError) {
      phaseLock.current = ''
      if (phaseError?.name !== 'AbortError') {
        setError('Não foi possível seguir para a próxima fase. Tente de novo.')
      }
    }
  }, [])

  const newRequest = useCallback(() => {
    phaseRequest.current?.abort()
    phaseRequest.current = new AbortController()
    return phaseRequest.current.signal
  }, [])

  useEffect(() => {
    if (!isHost || !code || !room) return

    // O tempo acabou se o relógio passou do horário guardado na sala. Não dá
    // para olhar o contador da tela: logo depois de trocar de fase ele ainda
    // guarda o valor da fase anterior, e um zero atrasado fazia as fases
    // dispararem em cadeia, uma atrás da outra, sem esperar ninguém.
    const expirou = Boolean(room.phaseEndsAt) && Date.now() >= room.phaseEndsAt

    switch (room.status) {
      case 'naming':
        if (expirou || everyoneReady(room)) advance(`naming:${code}`, () => finishNaming(code))
        return

      case 'ready':
        if (catalog.length) {
          advance(`torneio:${code}`, () => startTournament({ code, room, catalog, signal: newRequest() }))
        }
        return

      case 'pick':
        if (expirou || pairReadyToFight(room, players)) {
          advance(`match:${code}:${room.bracket?.round}:${room.bracket?.current}`,
            () => startMatch({ code, room, players, signal: newRequest() }))
        }
        return

      case 'preview':
        if (expirou) {
          advance(`battle:${code}:${room.bracket?.round}:${room.bracket?.current}`,
            () => (room.match?.auto ? resolveAuto({ code, room }) : startBattle({ code })))
        }
        return

      case 'battle':
        if (expirou || combatantsMoved(room, players)) {
          advance(`turn:${code}:${room.bracket?.current}:${room.match?.round}`,
            () => applyTurn({ code, room, players }))
        }
        return

      case 'roundEnd':
        if (expirou) {
          advance(`proximo:${code}:${room.bracket?.round}:${room.bracket?.current}`,
            () => nextMatch({ code, room }))
        }
        return

      default:
    }
  }, [advance, catalog, code, isHost, newRequest, players, room, secondsLeft])

  // O mesmo caminho que o relógio usaria, só que agora: passa pela trava de
  // fase, então não dispara duas vezes se o tempo acabar junto com o clique.
  const soMaquinas = somenteBots(room, players)

  const skipAuto = useCallback(() => {
    if (!isHost || !code || !room?.match?.auto || room.status !== 'preview') return
    advance(`battle:${code}:${room.bracket?.round}:${room.bracket?.current}`,
      () => resolveAuto({ code, room }))
  }, [advance, code, isHost, room])

  async function run(action) {
    setIsBusy(true)
    setError('')
    try {
      return await action()
    } catch (actionError) {
      setError(actionError.message || 'Algo deu errado. Tente novamente.')
      return null
    } finally {
      setIsBusy(false)
    }
  }

  return {
    bracket: room?.bracket || null,
    champion: room?.champion || null,
    championName: room?.champion
      ? players.find((player) => player.id === room.champion)?.masterName || 'Treinador'
      : null,
    chooseMove: (moveId) => submitMove({ code, playerId, moveId }),
    clearError: () => setError(''),
    code,
    create: (gymName, maxPlayers) => run(async () => {
      const created = await createRoom({ gymName, maxPlayers, playerId })
      attach(created)
      return created
    }),
    error,
    fillWithBots: () => run(() => fillWithBots({ code, room })),
    humans: humanPlayers(room),
    isBusy,
    isFighting: isFighting(room, playerId),
    isHost,
    join: (wanted) => run(async () => {
      const joined = await joinRoom({ code: wanted, playerId })
      attach(joined)
      return joined
    }),
    leave: () => run(async () => {
      const leaving = code
      detach()
      setRoom(null)
      setCode(null)
      if (leaving) await leaveRoom({ code: leaving, playerId, isHost })
    }),
    match: matchView(room, playerId, players),
    me,
    myPick: room?.picks?.[playerId],
    myTeam: room?.teams?.[playerId] || [],
    pair: currentPair(room),
    pick: (index) => setPick({ code, playerId, index }),
    players,
    playerId,
    room,
    saveMasterName: (name) => setMasterName({ code, playerId, masterName: name }),
    secondsLeft,
    skipAuto: isHost && room?.status === 'preview' && room?.match?.auto ? skipAuto : null,
    skipToEnd: isHost && soMaquinas && !room?.turbo && room?.status !== 'finished'
      ? () => setTurbo({ code })
      : null,
    setReady: (name, ready) => setReady({ code, playerId, masterName: name, ready }),
    startNaming: () => startNaming(code),
  }
}
