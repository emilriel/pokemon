import { useCallback, useEffect, useRef, useState } from 'react'
import { ATTACK_ACTION_INTERVAL_MS, chooseMoveForComputer, resolveTurn } from '../services/battle.js'
import { buildFighter } from '../services/fighters.js'
import { fetchPokemonDetails } from '../services/pokeApi.js'

// Segundos que cada jogador tem para escolher o golpe da rodada.
export const TURN_SECONDS = 15

// Pausa entre o fim da rodada e a próxima escolha, para dar tempo de ler o que houve.
const RESOLVE_PAUSE = 1800

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function useBattle(catalog) {
  // 'idle' | 'preparing' | 'choosing' | 'resolving' | 'finished'
  const [status, setStatus] = useState('idle')
  const [player, setPlayer] = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [round, setRound] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS)
  const [log, setLog] = useState([])
  const [winner, setWinner] = useState(null)
  const [error, setError] = useState('')
  const [seedPokemon, setSeedPokemon] = useState(null)

  // Espelho dos lutadores, para resolver a rodada sem depender do ciclo de render.
  const fighters = useRef({ player: null, opponent: null })
  const roundRef = useRef(1)
  const controller = useRef(null)
  const resolveTimeout = useRef(null)
  const isResolving = useRef(false)

  const cancelPending = useCallback(() => {
    controller.current?.abort()
    window.clearTimeout(resolveTimeout.current)
  }, [])

  useEffect(() => cancelPending, [cancelPending])

  const playTurn = useCallback((chosenMove) => {
    const { player: currentPlayer, opponent: currentOpponent } = fighters.current
    if (isResolving.current || !currentPlayer || !currentOpponent) return

    isResolving.current = true
    setStatus('resolving')

    const result = resolveTurn({
      player: currentPlayer,
      opponent: currentOpponent,
      playerMove: chosenMove,
      opponentMove: chooseMoveForComputer(currentOpponent, currentPlayer),
    })

    fighters.current = { player: result.player, opponent: result.opponent }
    setPlayer(result.player)
    setOpponent(result.opponent)
    setLog((currentLog) => [...currentLog, { round: roundRef.current, events: result.events }])

    const actionCount = result.events.filter((event) => event.kind === 'hit' || event.kind === 'miss').length
    const resolveDelay = Math.max(RESOLVE_PAUSE, actionCount * ATTACK_ACTION_INTERVAL_MS + 200)

    resolveTimeout.current = window.setTimeout(() => {
      isResolving.current = false

      if (result.winner) {
        setWinner(result.winner)
        setStatus('finished')
        return
      }

      roundRef.current += 1
      setRound(roundRef.current)
      setSecondsLeft(TURN_SECONDS)
      setStatus('choosing')
    }, resolveDelay)
  }, [])

  // Relógio da rodada: quando zera, o jogador perde a vez e só o rival ataca.
  useEffect(() => {
    if (status !== 'choosing') return undefined

    if (secondsLeft <= 0) {
      playTurn(null)
      return undefined
    }

    const timeoutId = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearTimeout(timeoutId)
  }, [playTurn, secondsLeft, status])

  const start = useCallback(async (chosenPokemon) => {
    cancelPending()
    isResolving.current = false
    roundRef.current = 1
    fighters.current = { player: null, opponent: null }

    const nextController = new AbortController()
    controller.current = nextController

    setSeedPokemon(chosenPokemon)
    setStatus('preparing')
    setError('')
    setLog([])
    setWinner(null)
    setRound(1)
    setSecondsLeft(TURN_SECONDS)
    setPlayer(null)
    setOpponent(null)

    const rivals = catalog.filter((entry) => entry.id !== chosenPokemon.id)
    const rivalEntry = rivals[Math.floor(Math.random() * rivals.length)]

    if (!rivalEntry) {
      setError('Não foi possível encontrar um rival no catálogo.')
      setStatus('idle')
      return
    }

    try {
      // O Pokémon pode vir da ficha (já com tudo) ou do sorteio (só nome e número).
      const needed = chosenPokemon.stats ? [rivalEntry] : [rivalEntry, chosenPokemon]
      const [rival, fetchedChoice] = await fetchPokemonDetails(needed, nextController.signal)
      const choice = fetchedChoice || chosenPokemon

      const [playerFighter, opponentFighter] = await Promise.all([
        buildFighter(choice, nextController.signal),
        buildFighter(rival, nextController.signal),
      ])

      if (nextController.signal.aborted) return

      fighters.current = { player: playerFighter, opponent: opponentFighter }
      setPlayer(playerFighter)
      setOpponent(opponentFighter)
      setStatus('choosing')
    } catch (startError) {
      if (isAbortError(startError) || nextController.signal.aborted) return
      setError('Não foi possível preparar a batalha. Tente novamente.')
      setStatus('idle')
    }
  }, [cancelPending, catalog])

  const rematch = useCallback(() => {
    if (seedPokemon) start(seedPokemon)
  }, [seedPokemon, start])

  const leave = useCallback(() => {
    cancelPending()
    isResolving.current = false
    fighters.current = { player: null, opponent: null }
    setStatus('idle')
    setPlayer(null)
    setOpponent(null)
    setSeedPokemon(null)
    setLog([])
    setWinner(null)
    setError('')
  }, [cancelPending])

  return {
    chooseMove: playTurn,
    error,
    leave,
    log,
    opponent,
    player,
    rematch,
    round,
    secondsLeft,
    start,
    status,
    winner,
  }
}
