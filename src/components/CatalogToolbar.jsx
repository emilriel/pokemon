import { useEffect, useId, useRef, useState } from 'react'
import { typeLabels } from './PokemonCard.jsx'

const typeOptions = Object.entries(typeLabels)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

const evolutionOptions = [
  { value: 'all', label: 'Todos os estágios' },
  { value: 'stage-1', label: '1º estágio' },
  { value: 'stage-2', label: '2º estágio' },
  { value: 'stage-3', label: '3º estágio' },
  { value: 'none', label: 'Não evolui' },
]

// Mostra no botão o que está escolhido, sem deixá-lo crescer demais.
function typeSummary(selectedTypes) {
  if (!selectedTypes.length) return 'Tipo'
  const [first, second] = selectedTypes.map((type) => typeLabels[type] || type)
  return second ? `${first} + ${second}` : first
}

export default function CatalogToolbar({
  count,
  evolution,
  maxTypes,
  onClearFilters,
  onEvolutionChange,
  onQueryChange,
  onTypeToggle,
  query,
  selectedTypes,
}) {
  const [isTypeOpen, setIsTypeOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const typeMenuRef = useRef(null)
  const typeButtonRef = useRef(null)
  const typeMenuId = useId()

  const hasFilters = selectedTypes.length > 0 || evolution !== 'all'
  const typeLimitReached = selectedTypes.length >= maxTypes

  // O botão de voltar ao topo só aparece depois que a página desce um pouco.
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.scrollY > 600)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fecha o menu de tipos ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!isTypeOpen) return undefined

    function handlePointerDown(event) {
      if (typeMenuRef.current?.contains(event.target)) return
      if (typeButtonRef.current?.contains(event.target)) return
      setIsTypeOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      setIsTypeOpen(false)
      typeButtonRef.current?.focus()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isTypeOpen])

  return (
    <div className="catalog-toolbar">
      <div className="toolbar-row">
        <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
          <label className="sr-only" htmlFor="pokemon-search">
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
            onChange={(event) => onQueryChange(event.target.value)}
            aria-controls="pokemon-grid"
          />
          {query && (
            <button className="clear-search" type="button" onClick={() => onQueryChange('')}>
              Limpar
            </button>
          )}
        </form>

        <div className="toolbar-filter">
          <button
            className="toolbar-select"
            type="button"
            ref={typeButtonRef}
            aria-expanded={isTypeOpen}
            aria-controls={typeMenuId}
            data-active={selectedTypes.length > 0}
            onClick={() => setIsTypeOpen((open) => !open)}
          >
            <span>{typeSummary(selectedTypes)}</span>
            <span className="toolbar-caret" aria-hidden="true">▾</span>
          </button>

          {isTypeOpen && (
            <div className="type-menu" id={typeMenuId} ref={typeMenuRef}>
              <p className="type-menu-hint">Escolha até {maxTypes} tipos</p>
              <div className="type-menu-options">
                {typeOptions.map(({ value, label }) => {
                  const isChecked = selectedTypes.includes(value)

                  return (
                    <label className="filter-option" key={value}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isChecked && typeLimitReached}
                        onChange={() => onTypeToggle(value)}
                      />
                      <span className="filter-chip">
                        <span className="filter-check" aria-hidden="true">✓</span>
                        <span className={`type-swatch type-${value}`} aria-hidden="true" />
                        {label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="toolbar-filter">
          <label className="sr-only" htmlFor="evolution-select">Estágio de evolução</label>
          <select
            className="toolbar-select"
            id="evolution-select"
            value={evolution}
            data-active={evolution !== 'all'}
            onChange={(event) => onEvolutionChange(event.target.value)}
          >
            {evolutionOptions.map(({ value, label }) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </div>

        <p className="toolbar-count">{count}</p>

        {hasFilters && (
          <button className="clear-filters" type="button" onClick={onClearFilters}>
            Limpar filtros
          </button>
        )}

        {/* Fica sempre no lugar, só invisível: tirá-lo do fluxo no meio da
            rolagem fazia o navegador cancelar o movimento. */}
        <button
          className="back-to-top"
          type="button"
          data-visible={showBackToTop}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <span aria-hidden="true">↑</span>
          <span className="sr-only">Voltar ao topo</span>
        </button>
      </div>
    </div>
  )
}
