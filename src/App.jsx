import { useEffect, useRef, useState } from 'react'
import BattlePreview from './components/BattlePreview.jsx'
import PokemonDialog from './components/PokemonDialog.jsx'
import PokemonFilters from './components/PokemonFilters.jsx'
import PokemonGrid from './components/PokemonGrid.jsx'
import usePokedex, { MAX_SELECTED_TYPES } from './hooks/usePokedex.js'
import { fetchPokemonDetails } from './services/pokeApi.js'

const numberFormatter = new Intl.NumberFormat('pt-BR')

export default function App() {
  const {
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
    totalMatches,
  } = usePokedex()
  const [selectedPokemon, setSelectedPokemon] = useState(null)
  const [pendingFocusId, setPendingFocusId] = useState(null)
  const [battlePlayer, setBattlePlayer] = useState(null)
  const [battleOpponent, setBattleOpponent] = useState(null)
  const [isLoadingOpponent, setIsLoadingOpponent] = useState(false)
  const [battleError, setBattleError] = useState('')
  const battleRequest = useRef(null)
  const battleRequestId = useRef(0)
  const battlePreviewRef = useRef(null)

  const isFiltering = Boolean(query.trim()) || selectedTypes.length > 0 || evolution !== 'all'
  const formattedMatches = totalMatches === null ? '' : numberFormatter.format(totalMatches)
  const resultsLabel = totalMatches === 1 ? 'resultado' : 'resultados'

  const statusMessage = error
    ? 'Não foi possível carregar os Pokémon.'
    : isLoading
      ? 'Carregando o catálogo de Pokémon.'
      : isSearching || totalMatches === null
        ? 'Buscando Pokémon.'
        : isFiltering
          ? `${formattedMatches} ${resultsLabel}. ${numberFormatter.format(pokemon.length)} exibidos.`
          : `${numberFormatter.format(pokemon.length)} Pokémon exibidos.`

  const countMessage = !catalog.length
    ? 'Conectando ao catálogo'
    : isFiltering && totalMatches !== null
      ? `${formattedMatches} ${resultsLabel}`
      : `${numberFormatter.format(catalog.length)} para descobrir`

  // Depois de "Carregar mais", leva o foco ao primeiro cartão novo para quem navega por teclado.
  useEffect(() => {
    if (pendingFocusId === null) return
    document.getElementById(`pokemon-card-${pendingFocusId}`)?.focus()
    setPendingFocusId(null)
  }, [pendingFocusId, pokemon])

  useEffect(() => () => battleRequest.current?.abort(), [])

  useEffect(() => {
    if (!battlePlayer) return
    battlePreviewRef.current?.focus({ preventScroll: true })
    battlePreviewRef.current?.scrollIntoView({ block: 'start' })
  }, [battlePlayer])

  async function handleLoadMore() {
    const firstNewPokemon = await loadMore()
    if (firstNewPokemon) setPendingFocusId(firstNewPokemon.id)
  }

  async function handleChooseForBattle(player) {
    battleRequest.current?.abort()
    const controller = new AbortController()
    battleRequest.current = controller
    const currentRequestId = ++battleRequestId.current
    const possibleOpponents = catalog.filter((entry) => entry.id !== player.id)
    const opponentEntry = possibleOpponents[Math.floor(Math.random() * possibleOpponents.length)]

    setBattlePlayer(player)
    setBattleOpponent(null)
    setBattleError('')
    setIsLoadingOpponent(Boolean(opponentEntry))
    setSelectedPokemon(null)

    if (!opponentEntry) {
      setBattleError('Não foi possível encontrar um rival no catálogo.')
      return
    }

    try {
      const [opponent] = await fetchPokemonDetails([opponentEntry], controller.signal)
      if (battleRequestId.current === currentRequestId) setBattleOpponent(opponent)
    } catch {
      if (battleRequestId.current === currentRequestId) {
        setBattleError('Não foi possível carregar o rival. Tente novamente.')
      }
    } finally {
      if (battleRequestId.current === currentRequestId) setIsLoadingOpponent(false)
    }
  }

  function clearBattlePreview() {
    battleRequest.current?.abort()
    battleRequestId.current += 1
    setBattlePlayer(null)
    setBattleOpponent(null)
    setIsLoadingOpponent(false)
    setBattleError('')
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#catalogo">
        Ir para o catálogo
      </a>

      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Pokédex, início">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Pokédex</span>
        </a>
        <span className="topbar-note">
          <span className="connection-dot" aria-hidden="true" />
          Módulo 01 <span className="topbar-divider" aria-hidden="true">/</span> Catálogo
        </span>
      </header>

      <main id="inicio" className="page-content">
        <section className="intro" aria-labelledby="page-title">
          <div className="intro-copy">
            <p className="eyebrow">SEU GUIA DE CAMPO POKÉMON</p>
            <h1 id="page-title">
              Todos eles,
              <br />
              <span>em um só lugar.</span>
            </h1>
            <p className="intro-description">
              Explore espécies, descubra seus tipos e encontre seu próximo favorito.
            </p>
          </div>
          <div className="intro-stamp">
            <span className="stamp-number">
              {catalog.length ? numberFormatter.format(catalog.length) : '...'}
            </span>
            <span className="stamp-label">Pokémon<br />no catálogo</span>
            <span className="stamp-source">DADOS POKEAPI</span>
          </div>
        </section>

        {battlePlayer && (
          <BattlePreview
            sectionRef={battlePreviewRef}
            player={battlePlayer}
            opponent={battleOpponent}
            isLoadingOpponent={isLoadingOpponent}
            error={battleError}
            onRetry={() => handleChooseForBattle(battlePlayer)}
            onClear={clearBattlePreview}
          />
        )}

        <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <p className="eyebrow">A COLEÇÃO</p>
              <h2 id="catalog-title">Pokémon</h2>
            </div>
            <p className="catalog-count">{countMessage}</p>
          </div>

          <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="search-label" htmlFor="pokemon-search">
              Pesquisar Pokémon por nome ou número
            </label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              id="pokemon-search"
              className="search-input"
              type="search"
              placeholder="Ex.: pikachu ou 25"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-controls="pokemon-grid"
            />
            {query && (
              <button className="clear-search" type="button" onClick={() => setQuery('')}>
                Limpar
              </button>
            )}
          </form>

          <PokemonFilters
            evolution={evolution}
            maxTypes={MAX_SELECTED_TYPES}
            onClear={clearFilters}
            onEvolutionChange={setEvolution}
            onTypeToggle={toggleType}
            selectedTypes={selectedTypes}
          />

          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {statusMessage}
          </p>

          {error ? (
            <div className="feedback-panel" role="alert">
              <span className="feedback-symbol" aria-hidden="true">!</span>
              <h3>O catálogo não respondeu.</h3>
              <p>{error}</p>
              <button className="secondary-button" type="button" onClick={retry}>
                Tentar novamente
              </button>
            </div>
          ) : isLoading || (isSearching && !pokemon.length) ? (
            <div className="loading-grid" aria-hidden="true">
              {Array.from({ length: 8 }, (_, index) => (
                <div className="skeleton-card" key={index}>
                  <span className="skeleton-art" />
                  <span className="skeleton-line" />
                  <span className="skeleton-line skeleton-line-short" />
                </div>
              ))}
            </div>
          ) : pokemon.length ? (
            <>
              <PokemonGrid
                pokemon={pokemon}
                onSelect={setSelectedPokemon}
                isBusy={isSearching || isLoadingMore}
              />
              {hasMore && (
                <div className="load-more-wrap">
                  <button
                    className="load-more-button"
                    type="button"
                    onClick={handleLoadMore}
                    aria-disabled={isLoadingMore || isSearching}
                  >
                    {isLoadingMore ? 'Carregando...' : 'Carregar mais Pokémon'}
                    {!isLoadingMore && <span aria-hidden="true"> ↓</span>}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="feedback-panel empty-panel">
              <span className="feedback-symbol" aria-hidden="true">?</span>
              <h3>Nenhum Pokémon encontrado.</h3>
              <p>
                {selectedTypes.length > 0 || evolution !== 'all'
                  ? 'Nenhum Pokémon combina com a busca e os filtros escolhidos.'
                  : 'Confira a escrita ou tente outro nome ou número.'}
              </p>
              <button className="secondary-button" type="button" onClick={clearAll}>
                Ver catálogo completo
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="page-footer">
        <span>Feito para quem escolheu começar a aventura.</span>
        <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
          Dados fornecidos pela PokéAPI <span aria-hidden="true">↗</span>
        </a>
      </footer>

      <PokemonDialog
        pokemon={selectedPokemon}
        onClose={() => setSelectedPokemon(null)}
        onChoose={handleChooseForBattle}
      />
    </div>
  )
}