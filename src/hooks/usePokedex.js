import { useEffect, useMemo, useRef, useState } from 'react'
import { getEvolutionCategory } from '../services/evolution.js'
import {
  fetchPokemonCatalog,
  fetchPokemonDetails,
  fetchTypeMembers,
} from '../services/pokeApi.js'

const PAGE_SIZE = 24
const SEARCH_DELAY = 250

export const MAX_SELECTED_TYPES = 2

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError'
}

// "Mr Mime" e "Flabébé" precisam encontrar "mr-mime" e "flabebe".
function normalizeQuery(text) {
  return text
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
}

function matchesSearch(entry, searchTerm) {
  if (!searchTerm) return true

  // "25", "#25" e "0025" procuram pelo número da Pokédex.
  const number = searchTerm.match(/^#?0*(\d+)$/)
  if (number) return entry.id === Number(number[1])

  return entry.name.includes(searchTerm)
}

export default function usePokedex() {
  const [catalog, setCatalog] = useState([])
  const [pokemon, setPokemon] = useState([])
  const [query, setQuery] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState([])
  const [evolution, setEvolution] = useState('all')
  const [typeMembers, setTypeMembers] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const detailsCache = useRef(new Map())
  const loadMoreController = useRef(null)
  const nextOffset = useRef(0)
  const requestId = useRef(0)

  // Guarda os detalhes já consultados para não repetir requisições ao trocar filtros.
  async function loadDetails(entries, signal) {
    const missing = entries.filter(({ name }) => !detailsCache.current.has(name))
    const results = await fetchPokemonDetails(missing, signal)
    missing.forEach(({ name }, index) => detailsCache.current.set(name, results[index]))
    return entries.map(({ name }) => detailsCache.current.get(name))
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadCatalog() {
      setIsLoading(true)
      setError('')

      try {
        setCatalog(await fetchPokemonCatalog(controller.signal))
      } catch (loadError) {
        if (!isAbortError(loadError)) {
          setError('Verifique sua conexão e tente novamente em instantes.')
          setIsLoading(false)
        }
      }
    }

    loadCatalog()
    return () => controller.abort()
  }, [retryCount])

  // Espera a pessoa parar de digitar antes de pesquisar.
  useEffect(() => {
    const nextTerm = normalizeQuery(query)

    if (!nextTerm) {
      setSearchTerm('')
      return undefined
    }

    const timeoutId = window.setTimeout(() => setSearchTerm(nextTerm), SEARCH_DELAY)
    return () => window.clearTimeout(timeoutId)
  }, [query])

  // Busca a lista de Pokémon de cada tipo selecionado (uma vez por tipo).
  useEffect(() => {
    const missingTypes = selectedTypes.filter((type) => !typeMembers[type])
    if (!missingTypes.length) return undefined

    const controller = new AbortController()

    Promise.all(
      missingTypes.map(async (type) => [type, await fetchTypeMembers(type, controller.signal)]),
    )
      .then((entries) => {
        setTypeMembers((current) => ({ ...current, ...Object.fromEntries(entries) }))
      })
      .catch((typeError) => {
        if (!isAbortError(typeError)) {
          setError('Não foi possível carregar esse filtro. Tente novamente.')
        }
      })

    return () => controller.abort()
  }, [selectedTypes, typeMembers, retryCount])

  // Lista de quem passa pela busca e pelos filtros; null enquanto algum dado ainda carrega.
  const matches = useMemo(() => {
    if (!catalog.length) return null
    if (selectedTypes.some((type) => !typeMembers[type])) return null

    return catalog.filter(
      (entry) =>
        matchesSearch(entry, searchTerm) &&
        selectedTypes.every((type) => typeMembers[type].has(entry.name)) &&
        (evolution === 'all' || getEvolutionCategory(entry.name) === evolution),
    )
  }, [catalog, evolution, searchTerm, selectedTypes, typeMembers])

  // Carrega o primeiro lote sempre que a busca ou os filtros mudam.
  useEffect(() => {
    loadMoreController.current?.abort()

    if (!matches) {
      if (catalog.length) setIsSearching(true)
      return undefined
    }

    const controller = new AbortController()
    const currentRequestId = ++requestId.current
    const firstPage = matches.slice(0, PAGE_SIZE)

    async function loadFirstPage() {
      setIsSearching(true)
      setError('')

      try {
        const results = await loadDetails(firstPage, controller.signal)
        if (requestId.current !== currentRequestId) return
        nextOffset.current = firstPage.length
        setPokemon(results)
        setHasMore(firstPage.length < matches.length)
      } catch (searchError) {
        if (isAbortError(searchError) || requestId.current !== currentRequestId) return
        setError('Não foi possível carregar os Pokémon. Tente novamente.')
      }

      if (requestId.current === currentRequestId) {
        setIsLoading(false)
        setIsSearching(false)
      }
    }

    loadFirstPage()
    return () => controller.abort()
  }, [catalog.length, matches])

  // Devolve o primeiro Pokémon do novo lote, para a tela levar o foco até ele.
  async function loadMore() {
    if (isLoadingMore || isSearching || !matches) return null

    const nextPage = matches.slice(nextOffset.current, nextOffset.current + PAGE_SIZE)

    if (!nextPage.length) {
      setHasMore(false)
      return null
    }

    const currentRequestId = ++requestId.current
    const controller = new AbortController()
    loadMoreController.current = controller
    setIsLoadingMore(true)
    setError('')

    try {
      const results = await loadDetails(nextPage, controller.signal)
      if (requestId.current !== currentRequestId) return null
      nextOffset.current += nextPage.length
      setPokemon((currentPokemon) => [...currentPokemon, ...results])
      setHasMore(nextOffset.current < matches.length)
      return results[0]
    } catch (loadError) {
      if (!isAbortError(loadError) && requestId.current === currentRequestId) {
        setError('Não foi possível carregar mais Pokémon. Tente novamente.')
      }
      return null
    } finally {
      setIsLoadingMore(false)
    }
  }

  function toggleType(type) {
    setSelectedTypes((current) => {
      if (current.includes(type)) return current.filter((item) => item !== type)
      if (current.length >= MAX_SELECTED_TYPES) return current
      return [...current, type]
    })
  }

  function clearFilters() {
    setSelectedTypes([])
    setEvolution('all')
  }

  function clearAll() {
    setQuery('')
    clearFilters()
  }

  function retry() {
    nextOffset.current = 0
    setCatalog([])
    setPokemon([])
    setHasMore(false)
    setRetryCount((count) => count + 1)
  }

  return {
    catalog,
    clearAll,
    clearFilters,
    error,
    evolution,
    hasMore,
    isLoading,
    isLoadingMore,
    isSearching,
    loadMore,
    pokemon,
    query,
    retry,
    selectedTypes,
    setEvolution,
    setQuery,
    toggleType,
    totalMatches: matches ? matches.length : null,
  }
}
