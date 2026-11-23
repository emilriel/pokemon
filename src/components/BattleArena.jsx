import { useEffect, useRef } from 'react'
import { TURN_SECONDS } from '../hooks/useBattle.js'
import { moveClassLabel } from '../services/battle.js'
import PokemonArt from './PokemonArt.jsx'
import { formatName, typeLabels } from './PokemonCard.jsx'

function Fighter({ fighter, side, sideLabel: given }) {
  const sideLabel = given || (side === 'player' ? 'SEU POKÉMON' : 'RIVAL')

  if (!fighter) {
    return (
      <div className={`battle-fighter battle-fighter-${side}`}>
        <span className="fighter-side-label">{sideLabel}</span>
        <div className="fighter-placeholder">
          <span className="fighter-placeholder-orb" aria-hidden="true" />
          <span>{side === 'player' ? 'Preparando...' : 'Buscando rival...'}</span>
        </div>
      </div>
    )
  }

  const name = formatName(fighter.name)
  const percent = Math.round((fighter.currentHP / fighter.maxHP) * 100)
  const healthLevel = percent <= 25 ? 'baixa' : percent <= 50 ? 'media' : 'alta'

  return (
    <article className={`battle-fighter battle-fighter-${side}`} data-down={fighter.currentHP === 0}>
      <span className="fighter-side-label">{sideLabel}</span>

      <div className="fighter-identity">
        <div className="fighter-heading">
          <h3>{name}</h3>
          <span className="fighter-number">#{String(fighter.id).padStart(4, '0')}</span>
        </div>
        <div className="type-list" aria-label={`Tipos de ${name}`}>
          {fighter.types.map((type) => (
            <span className={`type-badge type-${type}`} key={type}>
              {typeLabels[type] || type}
            </span>
          ))}
        </div>
      </div>

      <div className="fighter-art">
        <PokemonArt src={fighter.image} alt={`Ilustração de ${name}`} />
      </div>

      <div className="fighter-health">
        <div className="health-label-row">
          <span>VIDA</span>
          <span>{fighter.currentHP} / {fighter.maxHP}</span>
        </div>
        <div
          className="health-track"
          role="progressbar"
          aria-label={`Vida de ${name}`}
          aria-valuemin="0"
          aria-valuemax={fighter.maxHP}
          aria-valuenow={fighter.currentHP}
        >
          <span className="health-fill" data-level={healthLevel} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  )
}

export default function BattleArena({
  error,
  leaveLabel = 'Sair da batalha',
  log,
  onChooseMove,
  onLeave,
  onRematch,
  opponent,
  opponentLabel = 'RIVAL',
  player,
  playerLabel,
  round,
  secondsLeft,
  status,
  waitingText,
  winner,
}) {
  const logRef = useRef(null)
  const lastRound = log[log.length - 1]

  // Mantém a última rodada visível conforme o histórico cresce.
  useEffect(() => {
    const element = logRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [log])

  const isChoosing = status === 'choosing'
  const timePercent = Math.max(0, Math.round((secondsLeft / TURN_SECONDS) * 100))

  const headline = status === 'preparing'
    ? 'Preparando a batalha...'
    : status === 'finished'
      ? winner === 'player'
        ? 'Você venceu!'
        : winner === 'opponent'
          ? 'Você perdeu.'
          : 'Empate.'
      : status === 'resolving'
        ? 'Resolvendo a rodada...'
        : 'Escolha seu golpe'

  return (
    <section className="battle-screen" aria-labelledby="battle-title">
      <header className="battle-screen-header">
        <div>
          <p className="eyebrow">MÓDULO 02 · BATALHA</p>
          <h2 id="battle-title">{headline}</h2>
        </div>
        <button className="battle-clear" type="button" onClick={onLeave}>
          {leaveLabel} <span aria-hidden="true">×</span>
        </button>
      </header>

      {error && (
        <div className="feedback-panel" role="alert">
          <span className="feedback-symbol" aria-hidden="true">!</span>
          <h3>A batalha não começou.</h3>
          <p>{error}</p>
        </div>
      )}

      {status !== 'finished' && status !== 'preparing' && (
        <div className="battle-turn">
          <span className="battle-round">Rodada {round}</span>
          <div className="battle-timer">
            <div className="battle-timer-track" aria-hidden="true">
              <span className="battle-timer-fill" style={{ width: `${timePercent}%` }} data-low={secondsLeft <= 5} />
            </div>
            <span className="battle-timer-value">
              {isChoosing ? `${secondsLeft}s` : '—'}
            </span>
          </div>
        </div>
      )}

      <div className="battle-arena" aria-label="Arena de batalha">
        <Fighter fighter={player} side="player" sideLabel={playerLabel} />
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Fighter fighter={opponent} side="opponent" sideLabel={opponentLabel} />
      </div>

      {status === 'finished' ? (
        <div className="battle-end">
          {onRematch && (
            <button className="load-more-button" type="button" onClick={onRematch}>
              Lutar de novo
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onLeave}>
            {onRematch ? 'Escolher outro Pokémon' : leaveLabel}
          </button>
        </div>
      ) : (
        player && (
          <div className="battle-moves">
            <h3 className="battle-moves-title">
              Golpes de {formatName(player.name)}
              {!isChoosing && (
                <span className="battle-moves-hint"> · {waitingText || 'aguarde'}</span>
              )}
            </h3>
            <div className="move-list">
              {player.moves.map((move) => (
                <button
                  className="move-button"
                  type="button"
                  key={move.id}
                  disabled={!isChoosing}
                  onClick={() => onChooseMove(move)}
                >
                  <span className="move-name">{move.name}</span>
                  <span className={`type-badge type-${move.type}`}>
                    {typeLabels[move.type] || move.type}
                  </span>
                  <span className="move-stats">
                    Força {move.power} · Precisão {move.accuracy ?? 100} · {moveClassLabel(move.damageClass)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <div className="battle-log" ref={logRef} aria-live="polite" aria-atomic="false">
        <h3 className="sr-only">O que aconteceu na batalha</h3>
        {lastRound ? (
          log.map((entry) => (
            <p className="battle-log-round" key={entry.round}>
              <span className="battle-log-number">Rodada {entry.round}</span>
              {entry.events.map((event, index) => (
                <span className="battle-log-line" key={index}>
                  {event.text}
                  {event.note && <strong> {event.note}</strong>}
                </span>
              ))}
            </p>
          ))
        ) : (
          <p className="battle-log-round">
            <span className="battle-log-line">
              A batalha começa quando você escolher um golpe.
            </span>
          </p>
        )}
      </div>
    </section>
  )
}
