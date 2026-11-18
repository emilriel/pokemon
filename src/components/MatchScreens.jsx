import { useEffect, useState } from 'react'
import PokemonArt from './PokemonArt.jsx'
import { formatName, typeLabels } from './PokemonCard.jsx'
import { fetchPokemonDetails } from '../services/pokeApi.js'

// Busca os Pokémon sorteados para mostrar nome, ilustração e tipos na escolha.
function useRosterDetails(ids) {
  const [details, setDetails] = useState([])
  const chave = ids.join(',')

  useEffect(() => {
    if (!chave) return undefined

    const controller = new AbortController()
    fetchPokemonDetails(chave.split(',').map((id) => ({ name: id })), controller.signal)
      .then((list) => { if (!controller.signal.aborted) setDetails(list) })
      .catch(() => {})

    return () => controller.abort()
  }, [chave])

  return details
}

export function Sorteio({ roster, picked, secondsLeft, onPick }) {
  const details = useRosterDetails(roster)

  return (
    <div className="draft-screen">
      <p className="eyebrow">ESCOLHA</p>
      <h3>Qual Pokémon vai lutar?</h3>
      <p className="room-lobby-hint">
        {secondsLeft !== null ? `${secondsLeft} segundos` : 'Quase lá'} ·
        {' '}o rival não vê a sua escolha
      </p>

      {details.length ? (
        <div className="draft-options">
          {details.map((pokemon) => {
            const nome = formatName(pokemon.name)
            const escolhido = picked === pokemon.id
            const vida = pokemon.stats.find(({ stat }) => stat.name === 'hp')?.base_stat ?? 0

            return (
              <button
                className="draft-option"
                type="button"
                key={pokemon.id}
                data-chosen={escolhido}
                aria-pressed={escolhido}
                onClick={() => onPick(pokemon.id)}
              >
                <span className="draft-art">
                  <PokemonArt src={pokemon.sprites.other['official-artwork'].front_default
                    || pokemon.sprites.front_default} alt={`Ilustração de ${nome}`} />
                </span>
                <span className="draft-name">{nome}</span>
                <span className="type-list">
                  {pokemon.types.map(({ type }) => (
                    <span className={`type-badge type-${type.name}`} key={type.name}>
                      {typeLabels[type.name] || type.name}
                    </span>
                  ))}
                </span>
                <span className="draft-stat">Vida base {vida}</span>
                {escolhido && <span className="draft-chosen">Escolhido ✓</span>}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="room-lobby-hint">Sorteando...</p>
      )}

      {picked && <p className="room-lobby-hint">Esperando o rival escolher.</p>}
    </div>
  )
}

function Lado({ fighter, titulo }) {
  if (!fighter) return <div className="compare-side"><p>Preparando...</p></div>

  const nome = formatName(fighter.name)

  return (
    <article className="compare-side">
      <p className="eyebrow">{titulo}</p>
      <h4>{nome}</h4>
      <span className="type-list">
        {fighter.types.map((type) => (
          <span className={`type-badge type-${type}`} key={type}>
            {typeLabels[type] || type}
          </span>
        ))}
      </span>
      <span className="compare-art">
        <PokemonArt src={fighter.image} alt={`Ilustração de ${nome}`} />
      </span>
      <dl className="compare-stats">
        <div><dt>Vida</dt><dd>{fighter.maxHP}</dd></div>
        <div><dt>Ataque</dt><dd>{fighter.attack}</dd></div>
        <div><dt>Defesa</dt><dd>{fighter.defense}</dd></div>
        <div><dt>Velocidade</dt><dd>{fighter.speed}</dd></div>
      </dl>
    </article>
  )
}

export function Comparacao({ match, secondsLeft }) {
  return (
    <div className="compare-screen">
      <p className="eyebrow">O CONFRONTO</p>
      <h3>Comece a pensar na estratégia</h3>
      <p className="room-lobby-hint">
        A luta começa em {secondsLeft !== null ? secondsLeft : '...'} segundos.
      </p>

      <div className="compare-grid">
        <Lado fighter={match?.me} titulo="VOCÊ" />
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Lado fighter={match?.rival} titulo={match?.rivalName?.toUpperCase() || 'RIVAL'} />
      </div>
    </div>
  )
}
