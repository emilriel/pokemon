import { useEffect, useRef, useState } from 'react'
import { TURN_SECONDS } from '../hooks/useBattle.js'
import {
  ATTACK_ACTION_INTERVAL_MS,
  ATTACK_IMPACT_DELAY_MS,
  moveClassLabel,
} from '../services/battle.js'
import PokemonArt from './PokemonArt.jsx'
import { formatName, typeLabels } from './PokemonCard.jsx'

function Fighter({ displayHP, effect, fighter, side, sideLabel: given }) {
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
  const currentHP = displayHP ?? fighter.currentHP
  const percent = Math.round((currentHP / fighter.maxHP) * 100)
  const healthLevel = percent <= 25 ? 'baixa' : percent <= 50 ? 'media' : 'alta'

  return (
    <article
      className={`battle-fighter battle-fighter-${side}`}
      data-down={currentHP === 0}
      data-attacking={effect?.attacking || undefined}
      data-hit={effect?.impacts.some((impact) => impact.kind === 'hit') || undefined}
      data-motion={effect?.motion}
    >
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
        {effect?.impacts.map((impact) => (
          <span
            className={`battle-impact type-badge${impact.moveType ? ` type-${impact.moveType}` : ''}`}
            data-kind={impact.kind}
            data-type={impact.moveType}
            key={impact.key}
            aria-hidden="true"
          >
            {impact.kind === 'hit' ? `-${impact.damage} PV` : 'ERROU!'}
          </span>
        ))}
      </div>

      <div className="fighter-health">
        <div className="health-label-row">
          <span>VIDA</span>
          <span>{currentHP} / {fighter.maxHP}</span>
        </div>
        <div
          className="health-track"
          role="progressbar"
          aria-label={`Vida de ${name}`}
          aria-valuemin="0"
          aria-valuemax={fighter.maxHP}
          aria-valuenow={currentHP}
        >
          <span className="health-fill" data-level={healthLevel} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </article>
  )
}

export default function BattleArena({
  error,
  invertSides = false,
  leaveLabel = 'Sair da batalha',
  log,
  onChooseMove,
  onLeave,
  onRematch,
  opponent,
  opponentLabel = 'RIVAL',
  player,
  playerLabel,
  pendingWinnerName,
  round,
  secondsLeft,
  status,
  waitingText,
  winner,
}) {
  const logRef = useRef(null)
  const [sequence, setSequence] = useState({
    roundKey: null,
    activeIndex: -1,
    resolvedCount: 0,
    stage: 'done',
    playing: false,
  })
  const lastRound = log[log.length - 1]
  const actionEvents = lastRound?.events
    .filter((event) => event.kind === 'hit' || event.kind === 'miss')
    .map((event) => (
      invertSides && (event.side === 'player' || event.side === 'opponent')
        ? { ...event, side: event.side === 'player' ? 'opponent' : 'player' }
        : event
    )) || []
  const roundKey = lastRound ? `${lastRound.round}-${log.length}` : null
  const hasCurrentSequence = sequence.roundKey === roundKey
  const activeIndex = hasCurrentSequence
    ? sequence.activeIndex
    : actionEvents.length
      ? 0
      : -1
  const resolvedCount = hasCurrentSequence ? sequence.resolvedCount : 0
  const sequenceStage = hasCurrentSequence ? sequence.stage : 'attack'
  const sequencePlaying = actionEvents.length > 0
    && (!hasCurrentSequence || sequence.playing)
  const activeAction = sequencePlaying ? actionEvents[activeIndex] : null

  useEffect(() => {
    if (!roundKey || !actionEvents.length) {
      setSequence({
        roundKey,
        activeIndex: -1,
        resolvedCount: 0,
        stage: 'done',
        playing: false,
      })
      return undefined
    }

    setSequence({
      roundKey,
      activeIndex: 0,
      resolvedCount: 0,
      stage: 'attack',
      playing: true,
    })

    const timeouts = []
    actionEvents.forEach((_, index) => {
      if (index > 0) {
        timeouts.push(window.setTimeout(() => {
          setSequence((current) => current.roundKey === roundKey
            ? { ...current, activeIndex: index, stage: 'attack' }
            : current)
        }, index * ATTACK_ACTION_INTERVAL_MS))
      }

      timeouts.push(window.setTimeout(() => {
        setSequence((current) => current.roundKey === roundKey
          ? { ...current, resolvedCount: index + 1, stage: 'impact' }
          : current)
      }, index * ATTACK_ACTION_INTERVAL_MS + ATTACK_IMPACT_DELAY_MS))
    })
    timeouts.push(window.setTimeout(() => {
      setSequence((current) => current.roundKey === roundKey
        ? { ...current, activeIndex: -1, resolvedCount: actionEvents.length, stage: 'done', playing: false }
        : current)
    }, actionEvents.length * ATTACK_ACTION_INTERVAL_MS))

    return () => timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
  }, [roundKey, actionEvents.length])

  function targetSide(side) {
    return side === 'player' ? 'opponent' : 'player'
  }

  function displayHPFor(fighter, side) {
    if (!fighter || !lastRound || !actionEvents.length) return fighter?.currentHP

    const incoming = actionEvents.filter((event) => event.kind === 'hit' && targetSide(event.side) === side)
    if (!incoming.length) return fighter.currentHP
    if (incoming.some((event) => !Number.isFinite(event.targetHPBefore) || !Number.isFinite(event.targetHPAfter))) {
      return fighter.currentHP
    }

    const resolvedHits = actionEvents
      .slice(0, resolvedCount)
      .filter((event) => event.kind === 'hit' && targetSide(event.side) === side)

    return resolvedHits.length
      ? resolvedHits[resolvedHits.length - 1].targetHPAfter
      : incoming[0].targetHPBefore
  }

  function effectForSide(side) {
    if (!lastRound || !activeAction) return null

    const isImpact = sequenceStage === 'impact' && targetSide(activeAction.side) === side
    return {
      attacking: sequenceStage === 'attack' && activeAction.side === side,
      impacts: isImpact
        ? [{
            key: `${roundKey}-${activeIndex}`,
            kind: activeAction.kind,
            damage: activeAction.damage,
            moveType: activeAction.moveType,
          }]
        : [],
      motion: lastRound.round % 2 === 0 ? 'b' : 'a',
    }
  }

  const projectiles = activeAction && sequenceStage === 'attack'
    ? [{ key: `${roundKey}-${activeIndex}`, side: activeAction.side, type: activeAction.moveType, kind: activeAction.kind }]
    : []

  // Mantém a última rodada visível conforme o histórico cresce.
  useEffect(() => {
    const element = logRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [log, resolvedCount, sequenceStage])

  const isChoosing = status === 'choosing' && !sequencePlaying && !pendingWinnerName
  const timePercent = Math.min(100, Math.max(0, Math.round((secondsLeft / TURN_SECONDS) * 100)))
  const visibleRound = sequencePlaying && lastRound ? lastRound.round : round
  const sideName = (side) => (side === 'player'
    ? playerLabel || 'Seu Pokémon'
    : opponentLabel || 'Rival')
  const fighterName = (fighter) => (fighter ? formatName(fighter.name) : 'Pokémon')
  const sequenceMessage = activeAction
    ? sequenceStage === 'attack'
      ? `${sideName(activeAction.side)} (${fighterName(activeAction.side === 'player' ? player : opponent)}) usa ${activeAction.move}.`
      : activeAction.kind === 'hit'
        ? `Impacto · ${sideName(targetSide(activeAction.side))} (${fighterName(targetSide(activeAction.side) === 'player' ? player : opponent)}) perde ${activeAction.damage} PV.${activeAction.note ? ` ${activeAction.note}` : ''}${activeAction.targetHPAfter === 0 ? ' Nocaute! O contra-ataque foi cancelado.' : ''}`
        : `O ataque de ${sideName(activeAction.side)} errou.`
    : pendingWinnerName
      ? `${pendingWinnerName} venceu o confronto.`
      : lastRound?.events
        .filter((event) => event.kind === 'timeout')
        .map((event) => event.text)
        .join(' ') || 'Ataques da rodada concluídos.'

  const headline = sequencePlaying
    ? 'Ataques da rodada'
    : status === 'preparing'
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
          <span className="battle-round">Rodada {visibleRound}</span>
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

      {status !== 'finished' && status !== 'preparing' && (
        <p className="battle-turn-note">
          Cada lado escolhe um golpe; depois eles acontecem em sequência. O mais veloz começa (empate sorteado); um nocaute cancela o contra-ataque.
        </p>
      )}

      {lastRound && (actionEvents.length > 0 || lastRound.events.some((event) => event.kind === 'timeout')) && (
        <div className="battle-sequence" role="status" aria-live="polite" aria-atomic="true">
          <span className="battle-sequence-label">
            {sequencePlaying
              ? `${sequenceStage === 'impact' ? 'Impacto' : 'Ataque'} ${activeIndex + 1} de ${actionEvents.length}`
              : pendingWinnerName ? 'Confronto encerrado' : 'Resumo da rodada'}
          </span>
          <span className="battle-sequence-message">{sequenceMessage}</span>
        </div>
      )}

      <div className="battle-arena" aria-label="Arena de batalha">
        <Fighter
          displayHP={displayHPFor(player, 'player')}
          effect={effectForSide('player')}
          fighter={player}
          side="player"
          sideLabel={playerLabel}
        />
        {projectiles.map((projectile) => (
          <span
            className="battle-projectile"
            data-side={projectile.side}
            data-type={projectile.type}
            data-kind={projectile.kind}
            key={projectile.key}
            aria-hidden="true"
          />
        ))}
        <span className="battle-versus" aria-hidden="true">VS</span>
        <Fighter
          displayHP={displayHPFor(opponent, 'opponent')}
          effect={effectForSide('opponent')}
          fighter={opponent}
          side="opponent"
          sideLabel={opponentLabel}
        />
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
                <span className="battle-moves-hint">
                  {' · '}{sequencePlaying ? 'acompanhe a sequência' : waitingText || 'aguarde'}
                </span>
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

      <div className="battle-log" ref={logRef} aria-live="off" aria-atomic="false">
        <h3 className="sr-only">O que aconteceu na batalha</h3>
        {lastRound ? (
          log.map((entry, roundIndex) => {
            let actionIndex = 0
            let lastActionVisible = false
            const events = entry === lastRound && sequencePlaying
              ? entry.events.filter((event) => {
                  if (event.kind === 'hit' || event.kind === 'miss') {
                    lastActionVisible = actionIndex < resolvedCount
                    actionIndex += 1
                    return lastActionVisible
                  }
                  if (event.kind === 'faint') return lastActionVisible
                  if (event.kind === 'limite') return false
                  return true
                })
              : entry.events

            return (
              <p className="battle-log-round" key={`${entry.round}-${roundIndex}`}>
                <span className="battle-log-number">Rodada {entry.round}</span>
                {events.map((event, index) => (
                  <span className="battle-log-line" key={index}>
                    {event.text}
                    {event.note && <strong> {event.note}</strong>}
                  </span>
                ))}
              </p>
            )
          })
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
