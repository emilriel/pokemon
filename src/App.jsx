import { useEffect, useState } from 'react'
import BattleArena from './components/BattleArena.jsx'
import BattleRooms from './components/BattleRooms.jsx'
import CatalogToolbar from './components/CatalogToolbar.jsx'
import PokemonDialog from './components/PokemonDialog.jsx'
import PokemonGrid from './components/PokemonGrid.jsx'
import useBattle from './hooks/useBattle.js'
import useRoom from './hooks/useRoom.js'
import usePokedex, { MAX_SELECTED_TYPES } from './hooks/usePokedex.js'

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
  const [view, setView] = useState('pokedex')
  const [battleMode, setBattleMode] = useState(null)
  const battle = useBattle(catalog)
  const rooms = useRoom(catalog)

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
    ? 'Conectando...'
    : isFiltering && totalMatches !== null
      ? `${formattedMatches} ${resultsLabel}`
      : `${numberFormatter.format(catalog.length)} Pokémon`

  // Depois de "Carregar mais", leva o foco ao primeiro cartão novo para quem navega por teclado.
  useEffect(() => {
    if (pendingFocusId === null) return
    document.getElementById(`pokemon-card-${pendingFocusId}`)?.focus()
    setPendingFocusId(null)
  }, [pendingFocusId, pokemon])

  // Quem abre o site pelo QR Code de uma sala já entra por ela.
  useEffect(() => {
    if (rooms.room || rooms.code) {
      setView('battle')
      setBattleMode('amigos')
    }
  }, [rooms.code, rooms.room])

  async function handleLoadMore() {
    const firstNewPokemon = await loadMore()
    if (firstNewPokemon) setPendingFocusId(firstNewPokemon.id)
  }

  function handleChooseForBattle(chosen) {
    setSelectedPokemon(null)
    setView('battle')
    setBattleMode('computador')
    window.scrollTo({ top: 0 })
    battle.start(chosen)
  }

  function handleRandomFighter() {
    const entry = catalog[Math.floor(Math.random() * catalog.length)]
    if (entry) battle.start(entry)
  }

  function leaveBattle() {
    battle.leave()
    setBattleMode(null)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>

      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Pokédex, início">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Pokédex</span>
        </a>

        <nav className="topbar-nav" aria-label="Seções">
          <button
            className="topbar-tab"
            type="button"
            aria-current={view === 'pokedex' ? 'page' : undefined}
            onClick={() => setView('pokedex')}
          >
            Pokédex
          </button>
          <button
            className="topbar-tab"
            type="button"
            aria-current={view === 'battle' ? 'page' : undefined}
            onClick={() => setView('battle')}
          >
            Modo batalha
          </button>
        </nav>
      </header>

      <main id="inicio" className="page-content">
        <div id="conteudo" tabIndex={-1} className="sr-only" />

        {view === 'battle' ? (
          battleMode === 'amigos' ? (
            <BattleRooms
              code={rooms.code}
              error={rooms.error}
              isBusy={rooms.isBusy}
              isHost={rooms.isHost}
              me={rooms.me}
              onCreate={rooms.create}
              onJoin={rooms.join}
              onLeave={() => { rooms.leave(); setBattleMode(null) }}
              match={rooms.match}
              myRoster={rooms.myRoster}
              onChooseMove={rooms.chooseMove}
              onPick={rooms.pick}
              onSaveMasterName={rooms.saveMasterName}
              onSetReady={rooms.setReady}
              onStartNaming={rooms.startNaming}
              players={rooms.players}
              room={rooms.room}
              secondsLeft={rooms.secondsLeft}
            />
          ) : battle.status === 'idle' ? (
            <section className="battle-intro" aria-labelledby="battle-intro-title">
              <p className="eyebrow">MÓDULO 02 · BATALHA</p>
              <h2 id="battle-intro-title">Modo batalha</h2>
              <p className="battle-intro-text">
                A luta acontece por rodadas: você escolhe o golpe, o tipo conta, e vence quem
                zerar a vida do outro.
              </p>

              <div className="battle-modes">
                <button className="room-choice" type="button" onClick={() => setBattleMode('amigos')}>
                  <span className="room-choice-title">Jogar com amigos</span>
                  <span className="room-choice-text">
                    Crie uma sala e chame a galera pelo código ou pelo QR Code.
                  </span>
                </button>
                <button
                  className="room-choice"
                  type="button"
                  disabled={!catalog.length}
                  onClick={handleRandomFighter}
                >
                  <span className="room-choice-title">Treinar contra o computador</span>
                  <span className="room-choice-text">
                    {catalog.length
                      ? 'Sorteamos um Pokémon para você e um rival, e a luta começa.'
                      : 'Carregando o catálogo...'}
                  </span>
                </button>
              </div>
              {battle.error && (
                <div className="feedback-panel" role="alert">
                  <span className="feedback-symbol" aria-hidden="true">!</span>
                  <h3>A batalha não começou.</h3>
                  <p>{battle.error}</p>
                </div>
              )}
              <div className="battle-intro-actions">
                <button className="secondary-button" type="button" onClick={() => setView('pokedex')}>
                  Escolher um Pokémon na Pokédex
                </button>
              </div>
              <p className="battle-intro-note">
                O sorteio dos Pokémon e o chaveamento do torneio entram na próxima etapa.
              </p>
            </section>
          ) : (
            <BattleArena
              error={battle.error}
              log={battle.log}
              onChooseMove={battle.chooseMove}
              onLeave={leaveBattle}
              onRematch={battle.rematch}
              opponent={battle.opponent}
              player={battle.player}
              round={battle.round}
              secondsLeft={battle.secondsLeft}
              status={battle.status}
              winner={battle.winner}
            />
          )
        ) : (
          <section id="catalogo" className="catalog-section" aria-labelledby="catalog-title">
            <h2 id="catalog-title" className="sr-only">Catálogo de Pokémon</h2>

            <CatalogToolbar
              count={countMessage}
              evolution={evolution}
              maxTypes={MAX_SELECTED_TYPES}
              onClearFilters={clearFilters}
              onEvolutionChange={setEvolution}
              onQueryChange={setQuery}
              onTypeToggle={toggleType}
              query={query}
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
                {Array.from({ length: 10 }, (_, index) => (
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
        )}
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
