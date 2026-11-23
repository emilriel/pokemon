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

  // Todas as fases: as já jogadas, a atual, e as que ainda virão.
  //
  // Quem já venceu o confronto desta fase aparece na fase seguinte na hora, sem
  // precisar esperar o torneio virar de fase: o nome sobe para o lado dele do
  // quadro assim que a luta acaba.
  const fases = [...(bracket.history || []), { round: bracket.round, pairs: bracket.pairs }]
  let anterior = bracket.pairs
  for (let round = bracket.round + 1; round <= bracket.totalRounds; round += 1) {
    const vencedores = anterior.map((pair) => pair.winner || null)
    const proximos = []
    for (let i = 0; i < vencedores.length; i += 2) {
      proximos.push({ a: vencedores[i] || null, b: vencedores[i + 1] || null, winner: null })
    }
    fases.push({ round, pairs: proximos })
    anterior = proximos
  }

  // O quadro abre para os lados: metade dos confrontos à esquerda, metade à
  // direita, e a final no meio, como num chaveamento de campeonato.
  const colunas = []
  const anteriores = fases.filter((fase) => fase.round < bracket.totalRounds)
  const final = fases.find((fase) => fase.round === bracket.totalRounds)

  for (const fase of anteriores) {
    const corte = Math.ceil(fase.pairs.length / 2)
    colunas.push({ ...fase, lado: 'esquerda', pairs: fase.pairs.slice(0, corte), base: 0 })
  }
  if (final) colunas.push({ ...final, lado: 'final', pairs: final.pairs, base: 0 })
  for (const fase of [...anteriores].reverse()) {
    const corte = Math.ceil(fase.pairs.length / 2)
    colunas.push({ ...fase, lado: 'direita', pairs: fase.pairs.slice(corte), base: corte })
  }

  function Vaga({ id, pair }) {
    if (!id) return <span className="bracket-slot bracket-slot-open">A definir</span>

    return (
      <span
        className="bracket-slot"
        data-winner={pair.winner === id}
        data-out={Boolean(pair.winner) && pair.winner !== id}
        data-me={id === playerId}
      >
        {nome(id)}
        {id === playerId && <span className="bracket-you"> (você)</span>}
      </span>
    )
  }

  return (
    <div className="bracket-board">
      <h3 className="sr-only">Chaveamento do torneio</h3>
      {colunas.map((coluna, indice) => (
        <section
          className="bracket-round"
          key={`${coluna.round}-${coluna.lado}-${indice}`}
          data-current={coluna.round === bracket.round}
          data-final={coluna.lado === 'final'}
          data-lado={coluna.lado}
        >
          <h4>{nomeDaFase(coluna.round, bracket.totalRounds)}</h4>
          <ol className="bracket-matches">
            {coluna.pairs.map((pair, index) => (
              <li
                className="bracket-match"
                key={`${coluna.round}-${coluna.lado}-${index}`}
                data-current={coluna.round === bracket.round && coluna.base + index === bracket.current}
                data-done={Boolean(pair.winner)}
                data-final={coluna.lado === 'final'}
              >
                <Vaga id={pair.a} pair={pair} />
                <span className="bracket-vs" aria-hidden="true">×</span>
                {pair.a && !pair.b && coluna.round <= bracket.round
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

export function Comparacao({ match, secondsLeft, onSkip }) {
  return (
    <div className="compare-screen">
      <p className="eyebrow">O CONFRONTO</p>
      <h3>{match?.euLuto ? 'Comece a pensar na estratégia' : 'Você está assistindo este confronto'}</h3>
      <p className="room-lobby-hint">
        A luta começa em {secondsLeft !== null ? secondsLeft : '...'} segundos.
      </p>

      <div className="compare-grid">
        <Lado fighter={match?.me} titulo={(match?.meName || 'VOCÊ').toUpperCase()} />
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Lado fighter={match?.rival} titulo={(match?.rivalName || 'RIVAL').toUpperCase()} />
      </div>

      {onSkip && (
        <button className="secondary-button compare-skip" type="button" onClick={onSkip}>
          Adiantar a luta
        </button>
      )}
    </div>
  )
}

export function FimDoConfronto({ match, bracket }) {
  const proximaFase = bracket && bracket.round < bracket.totalRounds
    ? nomeDaFase(bracket.round + 1, bracket.totalRounds).toLowerCase()
    : 'final'

  const titulo = match?.euLuto
    ? match.iWon ? `Você passou para a ${proximaFase}!` : 'Você foi eliminado.'
    : `${match?.winnerName || 'O vencedor'} passou de fase.`

  return (
    <div className="result-screen">
      <p className="eyebrow">RESULTADO</p>
      <h3>{titulo}</h3>

      {(match?.me || match?.rival) && (
        <div className="result-grid">
          <LadoResultado fighter={match.me} nome={match.meName} />
          <span className="battle-versus" aria-hidden="true">VS</span>
          <LadoResultado fighter={match.rival} nome={match.rivalName} />
        </div>
      )}

      <p className="room-lobby-hint">Preparando o próximo confronto...</p>
    </div>
  )
}

function LadoResultado({ fighter, nome }) {
  if (!fighter) return <div className="result-side" />

  const caiu = fighter.currentHP <= 0
  const pokemon = formatName(fighter.name)

  return (
    <article className="result-side" data-down={caiu}>
      <span className="result-master">{nome}</span>
      <span className="result-art">
        <PokemonArt src={fighter.image} alt={`Ilustração de ${pokemon}`} />
      </span>
      <span className="result-name">{pokemon}</span>
      <span className="result-hp">
        {caiu ? 'Fora de combate' : `${fighter.currentHP} de ${fighter.maxHP} de vida`}
      </span>
    </article>
  )
}

export function Campeao({ championName, souEu, fighter, onLeave, isHost }) {
  const pokemon = fighter ? formatName(fighter.name) : null

  return (
    <div className="champion-screen">
      <span className="champion-medal" aria-hidden="true">1º</span>
      <p className="eyebrow">FIM DO TORNEIO</p>
      <h3>{souEu ? 'Você é o campeão!' : `${championName} é o campeão.`}</h3>

      {fighter && (
        <div className="champion-card">
          <span className="champion-art">
            <PokemonArt src={fighter.image} alt={`Ilustração de ${pokemon}`} />
          </span>
          <span className="champion-pokemon">{pokemon}</span>
          <span className="champion-hp">
            Terminou com {fighter.currentHP} de {fighter.maxHP} de vida
          </span>
        </div>
      )}

      <p className="room-lobby-hint">
        {souEu ? 'Ninguém segurou o seu time.' : 'Quem sabe na próxima.'}
      </p>
      <button className="secondary-button" type="button" onClick={onLeave}>
        {isHost ? 'Encerrar a sala' : 'Sair da sala'}
      </button>
    </div>
  )
}
