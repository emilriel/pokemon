import PokemonCard from './PokemonCard.jsx'

export default function PokemonGrid({ pokemon, onSelect, isBusy }) {
  return (
    <div id="pokemon-grid" className="pokemon-grid" aria-busy={isBusy}>
      {pokemon.map((item) => (
        <PokemonCard key={item.id} pokemon={item} onSelect={onSelect} />
      ))}
    </div>
  )
}