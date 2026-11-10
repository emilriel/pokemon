import { useEffect, useRef, useState } from 'react'
import { fetchPokemonCatalog, fetchPokemonDetails } from '../services/pokeApi.js'

const PAGE_SIZE = 24

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export default function usePokedex() {
  const [catalog, setCatalog] = useState([])
  const [pokemon, setPokemon] = useState([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const initialPokemon = useRef([])
  const nextOffset = useRef(0)
  const requestId = useRef(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      setIsLoading(true)
      setError('')

      try {
        const entries = await fetchPokemonCatalog(controller.signal)
        const firstPage = entries.slice(0, PAGE_SIZE)
        setCatalog(entries)

        const firstPokemon = await fetchPokemonDetails(firstPage, controller.signal)
        initialPokemon.current = firstPokemon
        nextOffset.current = firstPage.length
        setPokemon(firstPokemon)
        setHasMore(firstPage.length < entries.length)
      } catch (loadError) {
        if (!isAbortError(loadError)) {
          setError('Verifique sua conexão e tente novamente em instantes.')
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadCatalog()
    return () => controller.abort()
  }, [retryCount])

  useEffect(() => {
    if (!catalog.length) return undefined

    const searchTerm = query.trim().toLocaleLowerCase('pt-BR')

    if (!searchTerm) {
      requestId.current += 1
      setIsSearching(false)
      setError('')
      if (initialPokemon.current.length) {
        nextOffset.current = initialPokemon.current.length
        setPokemon(initialPokemon.current)
        setHasMore(initialPokemon.current.length < catalog.length)
      }
      return undefined
    }

    const controller = new AbortController()
    const currentRequestId = ++requestId.current
    const timeoutId = window.setTimeout(async () => {
      setIsSearching(true)
      setError('')

      const matches = catalog.filter(({ name }) =>
        name.toLocaleLowerCase('pt-BR').includes(searchTerm),
      )
      const firstPage = matches.slice(0, PAGE_SIZE)

      try {
        const results = await fetchPokemonDetails(firstPage, controller.signal)
        if (requestId.current !== currentRequestId) return
        nextOffset.current = firstPage.length
        setPokemon(results)
        setHasMore(firstPage.length < matches.length)
      } catch (searchError) {
        if (!isAbortError(searchError) && requestId.current === currentRequestId) {
          setError('Não foi possível concluir a pesquisa. Tente novamente.')
        }
      } finally {
        if (requestId.current === currentRequestId) setIsSearching(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
      if (requestId.current === currentRequestId) requestId.current += 1
    }
  }, [catalog, query])

  async function loadMore() {
    if (isLoadingMore || isSearching) return

    const searchTerm = query.trim().toLocaleLowerCase('pt-BR')
    const matchingEntries = searchTerm
      ? catalog.filter(({ name }) => name.toLocaleLowerCase('pt-BR').includes(searchTerm))
      : catalog
    const nextPage = matchingEntries.slice(nextOffset.current, nextOffset.current + PAGE_SIZE)

    if (!nextPage.length) {
      setHasMore(false)
      return
    }

    const currentRequestId = ++requestId.current
    const controller = new AbortController()
    setIsLoadingMore(true)
    setError('')

    try {
      const results = await fetchPokemonDetails(nextPage, controller.signal)
      if (requestId.current !== currentRequestId) return
      nextOffset.current += nextPage.length
      setPokemon((currentPokemon) => [...currentPokemon, ...results])
      setHasMore(nextOffset.current < matchingEntries.length)
    } catch (loadError) {
      if (!isAbortError(loadError) && requestId.current === currentRequestId) {
        setError('Não foi possível carregar mais Pokémon. Tente novamente.')
      }
    } finally {
      if (requestId.current === currentRequestId) setIsLoadingMore(false)
    }
  }

  function retry() {
    initialPokemon.current = []
    nextOffset.current = 0
    setCatalog([])
    setPokemon([])
    setHasMore(false)
    setRetryCount((count) => count + 1)
  }

  return {
    catalog,
    error,
    hasMore,
    isLoading,
    isLoadingMore,
    isSearching,
    loadMore,
    pokemon,
    query,
    retry,
    setQuery,
  }
}