import { useState } from 'react'
import { typeLabels } from './PokemonCard.jsx'

const typeOptions = Object.entries(typeLabels)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

const evolutionOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'stage-1', label: '1º estágio' },
  { value: 'stage-2', label: '2º estágio' },
  { value: 'stage-3', label: '3º estágio' },
  { value: 'none', label: 'Não evolui' },
]

export default function PokemonFilters({
  evolution,
  maxTypes,
  onClear,
  onEvolutionChange,
  onTypeToggle,
  selectedTypes,
}) {
  // Em telas estreitas os filtros ficam recolhidos para não empurrar a lista para baixo.
  const [isOpen, setIsOpen] = useState(false)
  const activeCount = selectedTypes.length + (evolution === 'all' ? 0 : 1)
  const typeLimitReached = selectedTypes.length >= maxTypes

  return (
    <div className="filters">
      <button
        className="filters-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="filters-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>
          Filtros{activeCount ? ` (${activeCount} ${activeCount === 1 ? 'ativo' : 'ativos'})` : ''}
        </span>
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>

      <div id="filters-panel" className="filters-panel" data-open={isOpen}>
        <fieldset className="filter-group">
          <legend>
            Tipo <span className="filter-hint">escolha até {maxTypes}</span>
          </legend>
          <div className="filter-options">
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
        </fieldset>

        <fieldset className="filter-group">
          <legend>
            Estágio de evolução <span className="filter-hint">o 1º é a forma inicial da linha</span>
          </legend>
          <div className="filter-options">
            {evolutionOptions.map(({ value, label }) => (
              <label className="filter-option" key={value}>
                <input
                  type="radio"
                  name="evolution-filter"
                  value={value}
                  checked={evolution === value}
                  onChange={() => onEvolutionChange(value)}
                />
                <span className="filter-chip">
                  <span className="filter-check" aria-hidden="true">✓</span>
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {activeCount > 0 && (
          <button className="clear-filters" type="button" onClick={onClear}>
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
