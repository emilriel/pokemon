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

export function Chaveamento({ bracket, players, playerId }) {
  if (!bracket) return null

  const nome = (id) => players.find((player) => player.id === id)?.masterName || '—'
  const fases = [...(bracket.history || []), { round: bracket.round, pairs: bracket.pairs }]

  // As fases que ainda não aconteceram entram como vagas em aberto, para o
  // quadro mostrar o caminho inteiro até a final desde o começo.
  let quantos = bracket.pairs.length
  for (let round = bracket.round + 1; round <= bracket.totalRounds; round += 1) {
    quantos = Math.ceil(quantos / 2)
    fases.push({ round, pairs: Array.from({ length: quantos }, () => ({ a: null, b: null, winner: null })) })
  }

  function Vaga({ id, pair }) {
    if (!id) return <span className="bracket-slot bracket-slot-open">A definir</span>

    const venceu = pair.winner === id
    const perdeu = pair.winner && pair.winner !== id

    return (
      <span className="bracket-slot" data-winner={venceu} data-out={perdeu} data-me={id === playerId}>
        {nome(id)}
        {id === playerId && <span className="bracket-you"> (você)</span>}
      </span>
    )
  }

  return (
    <div className="bracket-board">
      <h3 className="sr-only">Chaveamento do torneio</h3>
      {fases.map((fase) => (
        <section className="bracket-round" key={fase.round} data-current={fase.round === bracket.round}>
          <h4>{nomeDaFase(fase.round, bracket.totalRounds)}</h4>
          <ol className="bracket-matches">
            {fase.pairs.map((pair, index) => (
              <li
                className="bracket-match"
                key={`${fase.round}-${index}`}
                data-current={fase.round === bracket.round && index === bracket.current}
                data-done={Boolean(pair.winner)}
              >
                <Vaga id={pair.a} pair={pair} />
                <span className="bracket-vs" aria-hidden="true">×</span>
                {pair.a && !pair.b
                  ? <span className="bracket-slot bracket-slot-open">passa direto</span>
                  : <Vaga id={pair.b} pair={pair} />}
              </li>
            ))}
          </ol>
        </section>
      ))}
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

export function FimDoConfronto({ match, bracket }) {
  const proximaFase = bracket && bracket.round < bracket.totalRounds
    ? nomeDaFase(bracket.round + 1, bracket.totalRounds)
    : 'Final'

  return (
    <div className="room-ready">
      <p className="eyebrow">RESULTADO</p>
      <h3>
        {match?.euLuto
          ? match.iWon ? `Você passou para a ${proximaFase.toLowerCase()}!` : 'Você foi eliminado.'
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
