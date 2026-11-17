import { formatName, typeLabels } from './PokemonCard.jsx'

function getImage(pokemon) {
  return pokemon.sprites.other['official-artwork'].front_default
    || pokemon.sprites.front_default
}

function getBaseHP(pokemon) {
  return pokemon.stats.find(({ stat }) => stat.name === 'hp')?.base_stat ?? 1
}

function Fighter({ pokemon, side, isLoading, error, onRetry }) {
  if (!pokemon) {
    return (
      <div className={`battle-fighter battle-fighter-${side}`}>
        <span className="fighter-side-label">{side === 'player' ? 'SEU POKÉMON' : 'RIVAL'}</span>
        <div className="fighter-placeholder" aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <>
              <span className="fighter-placeholder-orb" aria-hidden="true" />
              <span>Buscando rival...</span>
            </>
          ) : (
            <>
              <span>{error || 'Aguardando rival'}</span>
              {error && (
                <button className="battle-retry" type="button" onClick={onRetry}>
                  Tentar novamente
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  const image = getImage(pokemon)
  const hp = getBaseHP(pokemon)
  const name = formatName(pokemon.name)

  return (
    <article className={`battle-fighter battle-fighter-${side}`}>
      <span className="fighter-side-label">{side === 'player' ? 'SEU POKÉMON' : 'RIVAL'}</span>
      <div className="fighter-identity">
        <div className="fighter-heading">
          <h3>{name}</h3>
          <span className="fighter-number">#{String(pokemon.id).padStart(4, '0')}</span>
        </div>
        <div className="type-list" aria-label={`Tipos de ${name}`}>
          {pokemon.types.map(({ type }) => (
            <span className={`type-badge type-${type.name}`} key={type.name}>
              {typeLabels[type.name] || type.name}
            </span>
          ))}
        </div>
      </div>
      <div className="fighter-art">
        {image && <img src={image} alt={`Ilustração de ${name}`} />}
      </div>
      <div className="fighter-health">
        <div className="health-label-row">
          <span>VIDA</span>
          <span>{hp} / {hp}</span>
        </div>
        <div
          className="health-track"
          role="progressbar"
          aria-label={`Vida de ${name}`}
          aria-valuemin="0"
          aria-valuemax={hp}
          aria-valuenow={hp}
        >
          <span className="health-fill" />
        </div>
      </div>
    </article>
  )
}

export default function BattlePreview({
  sectionRef,
  player,
  opponent,
  isLoadingOpponent,
  error,
  onRetry,
  onClear,
}) {
  return (
    <section
      className="battle-preview"
      aria-labelledby="battle-preview-title"
      ref={sectionRef}
      tabIndex={-1}
    >
      <header className="battle-preview-header">
        <div>
          <p className="eyebrow">MÓDULO 02 · PREPARAÇÃO</p>
          <h2 id="battle-preview-title">Prévia da batalha</h2>
        </div>
        <button className="battle-clear" type="button" onClick={onClear}>
          Remover seleção <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="battle-arena" aria-label="Arena de batalha">
        <Fighter pokemon={player} side="player" />
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Fighter
          pokemon={opponent}
          side="opponent"
          isLoading={isLoadingOpponent}
          error={error}
          onRetry={onRetry}
        />
      </div>
    </section>
  )
}