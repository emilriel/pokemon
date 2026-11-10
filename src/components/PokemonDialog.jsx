import { useEffect, useRef } from 'react'
import { formatName, typeLabels } from './PokemonCard.jsx'

const statLabels = {
  hp: 'Vida',
  attack: 'Ataque',
  defense: 'Defesa',
  'special-attack': 'Ataque especial',
  'special-defense': 'Defesa especial',
  speed: 'Velocidade',
}

export default function PokemonDialog({ pokemon, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (pokemon && !dialog.open) dialog.showModal()
    if (!pokemon && dialog.open) dialog.close()
  }, [pokemon])

  if (!pokemon) {
    return <dialog ref={dialogRef} className="pokemon-dialog" onClose={onClose} />
  }

  const image = pokemon.sprites.other['official-artwork'].front_default
    || pokemon.sprites.front_default

  return (
    <dialog
      ref={dialogRef}
      className="pokemon-dialog"
      aria-labelledby="dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <article className="dialog-content">
        <div className="dialog-toolbar">
          <span className="dialog-number">#{String(pokemon.id).padStart(4, '0')}</span>
          <form method="dialog">
            <button className="dialog-close" type="submit" aria-label="Fechar detalhes">
              Fechar <span aria-hidden="true">×</span>
            </button>
          </form>
        </div>

        <div className="dialog-overview">
          <div className="dialog-art">
            {image && <img src={image} alt={`Ilustração de ${formatName(pokemon.name)}`} />}
          </div>
          <div className="dialog-heading">
            <p className="eyebrow">FICHA POKÉMON</p>
            <h2 id="dialog-title">{formatName(pokemon.name)}</h2>
            <div className="type-list">
              {pokemon.types.map(({ type }) => (
                <span className={`type-badge type-${type.name}`} key={type.name}>
                  {typeLabels[type.name] || type.name}
                </span>
              ))}
            </div>
            <dl className="physical-stats">
              <div><dt>Altura</dt><dd>{(pokemon.height / 10).toLocaleString('pt-BR')} m</dd></div>
              <div><dt>Peso</dt><dd>{(pokemon.weight / 10).toLocaleString('pt-BR')} kg</dd></div>
            </dl>
          </div>
        </div>

        <section className="stats-section" aria-labelledby="stats-heading">
          <div className="stats-title-row">
            <h3 id="stats-heading">Atributos base</h3>
            <span>VALORES POKÉMON</span>
          </div>
          <ul className="stats-list">
            {pokemon.stats.map(({ base_stat: value, stat }) => (
              <li className="stat-row" key={stat.name}>
                <span className="stat-name">{statLabels[stat.name] || stat.name}</span>
                <span className="stat-value">{value}</span>
                <span
                  className="stat-track"
                  role="progressbar"
                  aria-label={statLabels[stat.name] || stat.name}
                  aria-valuemin="0"
                  aria-valuemax="180"
                  aria-valuenow={value}
                >
                  <span className="stat-fill" style={{ width: `${Math.min((value / 180) * 100, 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </dialog>
  )
}