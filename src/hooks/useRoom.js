import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearRoomFromLocation,
  codeFromLocation,
  createRoom,
  everyoneReady,
  finishNaming,
  getPlayerId,
  joinRoom,
  leaveRoom,
  playerList,
  releaseOnDisconnect,
  setMasterName,
  setReady,
  startNaming,
  watchRoom,
} from '../services/rooms.js'

export default function useRoom() {
  const [playerId] = useState(getPlayerId)
  const [code, setCode] = useState(null)
  const [room, setRoom] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(null)
  const stopWatching = useRef(null)
  const cancelDisconnect = useRef(null)

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

  // Relógio das fases com tempo (hoje só a do nome do mestre).
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

  // A fase do nome fecha quando todos se declaram prontos ou quando o minuto
  // acaba. Só o anfitrião escreve, para não haver duas escritas ao mesmo tempo.
  useEffect(() => {
    if (!isHost || !code || room?.status !== 'naming') return
    const tempoAcabou = secondsLeft !== null && secondsLeft <= 0
    if (tempoAcabou || everyoneReady(room)) finishNaming(code)
  }, [code, isHost, room, secondsLeft])

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
    code,
    create: (gymName, maxPlayers) => run(async () => {
      const created = await createRoom({ gymName, maxPlayers, playerId })
      attach(created)
      return created
    }),
    error,
    isBusy,
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
    me,
    players,
    playerId,
    room,
    saveMasterName: (name) => setMasterName({ code, playerId, masterName: name }),
    setReady: (name, ready) => setReady({ code, playerId, masterName: name, ready }),
    secondsLeft,
    startNaming: () => startNaming(code),
    clearError: () => setError(''),
  }
}
