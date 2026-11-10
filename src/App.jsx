import { useState } from 'react'
import PokemonDialog from './components/PokemonDialog.jsx'
import PokemonGrid from './components/PokemonGrid.jsx'
import usePokedex from './hooks/usePokedex.js'

const numberFormatter = new Intl.NumberFormat('pt-BR')

export default function App() {
  const {
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
  } = usePokedex()
  const [selectedPokemon, setSelectedPokemon] = useState(null)

  const statusMessage = error
    ? 'Não foi possível carregar os Pokémon.'
    : isLoading
      ? 'Carregando o catálogo de Pokémon.'
      : isSearching
        ? 'Buscando Pokémon.'
        : `${numberFormatter.format(pokemon.length)} Pokémon exibidos.`

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
          Módulo 01 <span className="topbar-divider">/</span> Catálogo
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
          <div className="intro-stamp" aria-label="Catálogo conectado à PokeAPI">
            <span className="stamp-number">
              {catalog.length ? numberFormatter.format(catalog.length) : '...'}
            </span>
            <span className="stamp-label">espécies<br />no catálogo</span>
            <span className="stamp-source">DADOS POKEAPI</span>
          </div>
        </section>

        <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
          <div className="catalog-heading">
            <div>
              <p className="eyebrow">A COLEÇÃO</p>
              <h2 id="catalog-title">Pokémon</h2>
            </div>
            <p className="catalog-count">
              {catalog.length
                ? `${numberFormatter.format(catalog.length)} para descobrir`
                : 'Conectando ao catálogo'}
            </p>
          </div>

          <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
            <label className="search-label" htmlFor="pokemon-search">
              Pesquisar Pokémon pelo nome
            </label>
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              id="pokemon-search"
              className="search-input"
              type="search"
              placeholder="Experimente: pikachu"
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
          ) : isLoading ? (
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
                    onClick={loadMore}
                    disabled={isLoadingMore || isSearching}
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
              <p>Confira a escrita ou tente outro nome.</p>
              <button className="secondary-button" type="button" onClick={() => setQuery('')}>
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

      <PokemonDialog pokemon={selectedPokemon} onClose={() => setSelectedPokemon(null)} />
    </div>
  )
}