import PokemonArt from './PokemonArt.jsx'
import { formatName, typeLabels } from './PokemonCard.jsx'
import { nomeDaFase } from '../services/match.js'

function Tipos({ types }) {
  return (
    <span className="type-list">
      {types.map((type) => (
        <span className={`type-badge type-${type}`} key={type}>
          {typeLabels[type] || type}
        </span>
      ))}
    </span>
  )
}

export function Chaveamento({ bracket, players }) {
  if (!bracket) return null

  const nome = (id) => players.find((player) => player.id === id)?.masterName || '—'

  return (
    <div className="bracket">
      <p className="bracket-title">
        {nomeDaFase(bracket.round, bracket.totalRounds)}
      </p>
      <ol className="bracket-pairs">
        {bracket.pairs.map((pair, index) => (
          <li
            className="bracket-pair"
            key={`${pair.a}-${index}`}
            data-current={index === bracket.current}
            data-done={Boolean(pair.winner)}
          >
            <span data-winner={pair.winner === pair.a}>{nome(pair.a)}</span>
            <span className="bracket-vs" aria-hidden="true">×</span>
            <span data-winner={pair.winner === pair.b}>{pair.b ? nome(pair.b) : 'passa direto'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Sorteio({ team, picked, secondsLeft, onPick, euLuto, rivalName }) {
  if (!euLuto) {
    return (
      <div className="draft-screen">
        <p className="eyebrow">ESCOLHA</p>
        <h3>Os dois estão escolhendo o Pokémon</h3>
        <p className="room-lobby-hint">
          {secondsLeft !== null ? `${secondsLeft} segundos` : 'Quase lá'} · você assiste este confronto
        </p>
      </div>
    )
  }

  return (
    <div className="draft-screen">
      <p className="eyebrow">ESCOLHA</p>
      <h3>Quem vai lutar contra {rivalName}?</h3>
      <p className="room-lobby-hint">
        {secondsLeft !== null ? `${secondsLeft} segundos` : 'Quase lá'} ·
        {' '}o rival não vê a sua escolha · a vida não se recupera entre as fases
      </p>

      <div className="draft-options">
        {team.map((member, index) => {
          const nome = formatName(member.name)
          const escolhido = picked === index
          const caido = member.currentHP <= 0

          return (
            <button
              className="draft-option"
              type="button"
              key={`${member.id}-${index}`}
              data-chosen={escolhido}
              aria-pressed={escolhido}
              disabled={caido}
              onClick={() => onPick(index)}
            >
              <span className="draft-art">
                <PokemonArt src={member.image} alt={`Ilustração de ${nome}`} />
              </span>
              <span className="draft-name">{nome}</span>
              <Tipos types={member.types} />
              <span className="draft-stat">
                {caido ? 'Fora de combate' : `Vida ${member.currentHP} de ${member.maxHP}`}
              </span>
              {escolhido && <span className="draft-chosen">Escolhido ✓</span>}
            </button>
          )
        })}
      </div>

      {picked !== undefined && <p className="room-lobby-hint">Esperando o rival escolher.</p>}
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
      <Tipos types={fighter.types} />
      <span className="compare-art">
        <PokemonArt src={fighter.image} alt={`Ilustração de ${nome}`} />
      </span>
      <dl className="compare-stats">
        <div><dt>Vida</dt><dd>{fighter.currentHP} / {fighter.maxHP}</dd></div>
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
      <h3>{match?.euLuto ? 'Comece a pensar na estratégia' : 'Próximo confronto'}</h3>
      <p className="room-lobby-hint">
        A luta começa em {secondsLeft !== null ? secondsLeft : '...'} segundos.
      </p>

      <div className="compare-grid">
        <Lado fighter={match?.me} titulo={(match?.meName || 'VOCÊ').toUpperCase()} />
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Lado fighter={match?.rival} titulo={(match?.rivalName || 'RIVAL').toUpperCase()} />
      </div>
    </div>
  )
}

export function FimDoConfronto({ match }) {
  return (
    <div className="room-ready">
      <p className="eyebrow">RESULTADO</p>
      <h3>
        {match?.euLuto
          ? match.iWon ? 'Você passou de fase!' : 'Você foi eliminado.'
          : `${match?.winnerName || 'O vencedor'} passou de fase.`}
      </h3>
      <p className="room-lobby-hint">Preparando o próximo confronto...</p>
    </div>
  )
}

export function Campeao({ championName, souEu, onLeave, isHost }) {
  return (
    <div className="room-ready champion-screen">
      <p className="eyebrow">FIM DO TORNEIO</p>
      <h3>{souEu ? 'Você é o campeão!' : `${championName} é o campeão.`}</h3>
      <p className="room-lobby-hint">
        {souEu ? 'Ninguém segurou o seu time.' : 'Quem sabe na próxima.'}
      </p>
      <button className="secondary-button" type="button" onClick={onLeave}>
        {isHost ? 'Encerrar a sala' : 'Sair da sala'}
      </button>
    </div>
  )
}
