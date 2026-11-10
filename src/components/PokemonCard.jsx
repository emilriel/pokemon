const typeLabels = {
  bug: 'Inseto',
  dark: 'Sombrio',
  dragon: 'Dragão',
  electric: 'Elétrico',
  fairy: 'Fada',
  fighting: 'Lutador',
  fire: 'Fogo',
  flying: 'Voador',
  ghost: 'Fantasma',
  grass: 'Planta',
  ground: 'Terra',
  ice: 'Gelo',
  normal: 'Normal',
  poison: 'Veneno',
  psychic: 'Psíquico',
  rock: 'Pedra',
  steel: 'Metal',
  water: 'Água',
}

function formatName(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export { formatName, typeLabels }

export default function PokemonCard({ pokemon, onSelect }) {
  const image = pokemon.sprites.other['official-artwork'].front_default
    || pokemon.sprites.front_default

  return (
    <button
      className="pokemon-card"
      type="button"
      onClick={() => onSelect(pokemon)}
      aria-label={`Ver detalhes de ${formatName(pokemon.name)}`}
    >
      <span className="card-number">#{String(pokemon.id).padStart(4, '0')}</span>
      <span className="card-art">
        {image ? (
          <img src={image} alt={`Ilustração de ${formatName(pokemon.name)}`} loading="lazy" />
        ) : (
          <span className="image-fallback" aria-hidden="true">?</span>
        )}
      </span>
      <span className="card-copy">
        <span className="card-name">{formatName(pokemon.name)}</span>
        <span className="type-list" aria-label="Tipos">
          {pokemon.types.map(({ type }) => (
            <span className={`type-badge type-${type.name}`} key={type.name}>
              {typeLabels[type.name] || type.name}
            </span>
          ))}
        </span>
        <span className="card-link">Ver detalhes <span aria-hidden="true">↗</span></span>
      </span>
    </button>
  )
}