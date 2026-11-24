import { useEffect, useRef, useState } from 'react'
import BattleArena from './BattleArena.jsx'
import { Campeao, Chaveamento, Comparacao, FimDoConfronto, Sorteio } from './MatchScreens.jsx'
import QrCode from './QrCode.jsx'
import QrScanner from './QrScanner.jsx'
import { MAX_PLAYERS, MIN_PLAYERS, isValidCode, roomLink } from '../services/rooms.js'

const playerCounts = []
for (let count = MIN_PLAYERS; count <= MAX_PLAYERS; count += 2) playerCounts.push(count)

function Entrada({ onCreate, onJoin, isBusy }) {
  const [mode, setMode] = useState(null)
  const [gymName, setGymName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState(2)
  const [code, setCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  if (!mode) {
    return (
      <div className="room-choices">
        <button className="room-choice" type="button" onClick={() => setMode('create')}>
          <span className="room-choice-title">Criar uma sala</span>
          <span className="room-choice-text">
            Você escolhe o nome do ginásio e quantos jogadores entram. Sai um código e um QR Code
            para chamar os amigos.
          </span>
        </button>
        <button className="room-choice" type="button" onClick={() => setMode('join')}>
          <span className="room-choice-title">Entrar em uma sala</span>
          <span className="room-choice-text">
            Digite o código de 6 números que seu amigo passou, ou aponte a câmera para o QR Code
            dele.
          </span>
        </button>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <form
        className="room-form"
        onSubmit={(event) => {
          event.preventDefault()
          onCreate(gymName, maxPlayers)
        }}
      >
        <h3>Criar uma sala</h3>

        <label className="room-field">
          <span>Nome do ginásio</span>
          <input
            type="text"
            maxLength={24}
            value={gymName}
            placeholder="Ex.: Ginásio de Cerulean"
            onChange={(event) => setGymName(event.target.value)}
          />
        </label>

        <label className="room-field">
          <span>Quantos jogadores</span>
          <select
            value={maxPlayers}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
          >
            {playerCounts.map((count) => (
              <option value={count} key={count}>{count} jogadores</option>
            ))}
          </select>
        </label>

        <div className="room-form-actions">
          <button className="load-more-button" type="submit" aria-disabled={isBusy}>
            {isBusy ? 'Criando...' : 'Criar sala'}
          </button>
          <button className="secondary-button" type="button" onClick={() => setMode(null)}>
            Voltar
          </button>
        </div>
      </form>
    )
  }

  return (
    <form
      className="room-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (isValidCode(code)) onJoin(code)
      }}
    >
      <h3>Entrar em uma sala</h3>

      <label className="room-field">
        <span>Código da sala</span>
        <input
          className="room-code-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={code}
          placeholder="000000"
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
      </label>

      {isScanning ? (
        <QrScanner onRead={(read) => { setIsScanning(false); onJoin(read) }} onCancel={() => setIsScanning(false)} />
      ) : (
        <button className="secondary-button" type="button" onClick={() => setIsScanning(true)}>
          Ler o QR Code com a câmera
        </button>
      )}

      <div className="room-form-actions">
        <button
          className="load-more-button"
          type="submit"
          aria-disabled={isBusy || !isValidCode(code)}
        >
          {isBusy ? 'Entrando...' : 'Entrar'}
        </button>
        <button className="secondary-button" type="button" onClick={() => setMode(null)}>
          Voltar
        </button>
      </div>
    </form>
  )
}

function Espera({ code, isHost, players, room, onStart, onLeave, onFillWithBots }) {
  const isFull = players.length >= room.maxPlayers

  return (
    <div className="room-lobby">
      <div className="room-lobby-main">
        <p className="eyebrow">SALA DE ESPERA</p>
        <h3>{room.gymName}</h3>

        <p className="room-code-display">
          <span className="sr-only">Código da sala:</span>
          {code.split('').map((digit, index) => (
            <span className="room-code-digit" key={index}>{digit}</span>
          ))}
        </p>

        <p className="room-lobby-hint">
          {isFull
            ? 'Sala cheia. Dá para começar.'
            : `Faltam ${room.maxPlayers - players.length} de ${room.maxPlayers} jogadores.`}
        </p>

        <ul className="room-players">
          {players.map((player, index) => (
            <li className="room-player" key={player.id}>
              <span className="room-player-number">{index + 1}</span>
              <span>
                {player.isBot ? player.masterName : player.isHost ? 'Anfitrião' : 'Jogador'}
              </span>
            </li>
          ))}
          {Array.from({ length: Math.max(0, room.maxPlayers - players.length) }, (_, index) => (
            <li className="room-player room-player-empty" key={`vazio-${index}`}>
              <span className="room-player-number">{players.length + index + 1}</span>
              <span>Aguardando...</span>
            </li>
          ))}
        </ul>

        <div className="room-form-actions">
          {isHost ? (
            <>
              <button
                className="load-more-button"
                type="button"
                disabled={!isFull}
                onClick={onStart}
              >
                Iniciar batalha
              </button>
              {!isFull && (
                <button className="secondary-button" type="button" onClick={onFillWithBots}>
                  Completar com o computador
                </button>
              )}
            </>
          ) : (
            <p className="room-lobby-hint">O anfitrião começa quando a sala encher.</p>
          )}
          <button className="secondary-button" type="button" onClick={onLeave}>
            {isHost ? 'Encerrar a sala' : 'Sair da sala'}
          </button>
        </div>
      </div>

      <div className="room-qr">
        <QrCode value={roomLink(code)} label={`QR Code da sala ${code}`} />
        <p>Aponte a câmera do seu amigo para este código.</p>
      </div>
    </div>
  )
}

function NomeDoMestre({ me, players, secondsLeft, onSave, onReady }) {
  const [name, setName] = useState(me?.masterName || '')
  const saved = useRef('')
  const isReady = Boolean(me?.ready)

  // Guarda o que foi digitado sem esperar o botão, caso o tempo acabe antes.
  useEffect(() => {
    if (isReady || name === saved.current) return undefined
    const timeoutId = window.setTimeout(() => {
      saved.current = name
      onSave(name)
    }, 500)
    return () => window.clearTimeout(timeoutId)
  }, [isReady, name, onSave])

  const prontos = players.filter((player) => player.ready).length

  return (
    <div className="room-naming">
      <p className="eyebrow">PREPARAÇÃO</p>
      <h3>Qual é o nome do seu mestre Pokémon?</h3>
      <p className="room-lobby-hint">
        {secondsLeft !== null ? `${secondsLeft} segundos` : 'Quase lá'} ·
        {' '}{prontos} de {players.length} {prontos === 1 ? 'pronto' : 'prontos'}
      </p>

      <label className="room-field">
        <span className="sr-only">Nome do mestre</span>
        <input
          type="text"
          maxLength={20}
          autoFocus
          disabled={isReady}
          value={name}
          placeholder="Ex.: Matheus"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <div className="room-form-actions">
        {isReady ? (
          <>
            <p className="room-lobby-hint">Esperando os outros jogadores.</p>
            <button className="secondary-button" type="button" onClick={() => onReady(name, false)}>
              Mudar meu nome
            </button>
          </>
        ) : (
          <button
            className="load-more-button"
            type="button"
            disabled={!name.trim()}
            onClick={() => onReady(name, true)}
          >
            Estou pronto
          </button>
        )}
      </div>

      <ul className="room-players">
        {players.map((player) => (
          <li className="room-player" key={player.id} data-ready={Boolean(player.ready)}>
            <span className="room-player-number">{player.ready ? '✓' : '…'}</span>
            <span>{player.masterName || 'Escolhendo...'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function BattleRooms({
  bracket,
  champion,
  championName,
  code,
  error,
  isBusy,
  isFighting,
  isHost,
  match,
  me,
  myPick,
  myTeam,
  onChooseMove,
  onFillWithBots,
  onPick,
  onCreate,
  onJoin,
  onLeave,
  onSaveMasterName,
  onSetReady,
  onSkipAuto,
  onSkipToEnd,
  onStartNaming,
  players,
  room,
  secondsLeft,
}) {
  // Na escolha o confronto ainda não existe, então o nome do rival vem do par.
  const pair = room?.bracket?.pairs?.[room.bracket.current]
  const rivalId = pair && (pair.a === me?.id ? pair.b : pair.b === me?.id ? pair.a : null)
  const rivalName = players.find((player) => player.id === rivalId)?.masterName || 'seu rival'

  // Durante a luta a tela é só a arena, sem o cabeçalho das salas.
  if (room && room.status === 'battle') {
    return (
      <BattleArena
        leaveLabel={isHost ? 'Encerrar a sala' : 'Sair da sala'}
        log={match?.log || []}
        onChooseMove={(move) => onChooseMove(move.id)}
        onLeave={onLeave}
        opponent={match?.rival}
        opponentLabel={(match?.rivalName || 'RIVAL').toUpperCase()}
        player={match?.me}
        playerLabel={(match?.meName || 'SEU POKÉMON').toUpperCase()}
        invertSides={match?.invertSides}
        round={match?.round || 1}
        secondsLeft={secondsLeft ?? 0}
        status={match?.pendingWinnerName
          ? 'resolving'
          : isFighting
            ? (match?.myMove ? 'resolving' : 'choosing')
            : 'resolving'}
        pendingWinnerName={match?.pendingWinnerName}
        waitingText={isFighting
          ? (match?.myMove ? 'esperando o rival' : 'aguarde')
          : 'você está assistindo'}
        winner={null}
      />
    )
  }

  return (
    <section
      className="rooms-screen"
      aria-labelledby="rooms-title"
      data-match={['pick', 'preview', 'roundEnd', 'finished'].includes(room?.status)}
    >
      <header className="rooms-header">
        <p className="eyebrow">MÓDULO 02 · SALAS</p>
        <h2 id="rooms-title">Jogar com amigos</h2>
      </header>

      {error && (
        <div className="feedback-panel" role="alert">
          <span className="feedback-symbol" aria-hidden="true">!</span>
          <h3>Não deu certo.</h3>
          <p>{error}</p>
        </div>
      )}

      {!room && <Entrada onCreate={onCreate} onJoin={onJoin} isBusy={isBusy} />}

      {room && room.status === 'lobby' && (
        <Espera
          code={code}
          isHost={isHost}
          players={players}
          room={room}
          onStart={onStartNaming}
          onLeave={onLeave}
          onFillWithBots={onFillWithBots}
        />
      )}

      {room && room.status === 'naming' && (
        <NomeDoMestre
          me={me}
          players={players}
          secondsLeft={secondsLeft}
          onSave={onSaveMasterName}
          onReady={onSetReady}
        />
      )}

      {room && room.status === 'ready' && (
        <div className="room-ready">
          <p className="eyebrow">TUDO PRONTO</p>
          <h3>{room.gymName}</h3>
          <ul className="room-players">
            {players.map((player) => (
              <li className="room-player" key={player.id} data-ready="true">
                <span className="room-player-number">★</span>
                <span>{player.masterName || 'Mestre sem nome'}</span>
              </li>
            ))}
          </ul>
          <p className="room-lobby-hint">Sorteando os times...</p>
        </div>
      )}

      {onSkipToEnd && (
        <p className="skip-rest">
          Só restam treinadores do computador.{' '}
          <button className="link-button" type="button" onClick={onSkipToEnd}>
            Pular para o resultado final
          </button>
        </p>
      )}

      {room && room.status === 'pick' && (
        <>
          <Chaveamento bracket={bracket} players={players} playerId={me?.id} />
          <Sorteio
            team={myTeam}
            picked={myPick}
            secondsLeft={secondsLeft}
            onPick={onPick}
            euLuto={isFighting}
            rivalName={rivalName}
          />
        </>
      )}

      {room && room.status === 'preview' && (
        <Comparacao match={match} secondsLeft={secondsLeft} onSkip={onSkipAuto} />
      )}

      {room && room.status === 'roundEnd' && (
        <>
          <Chaveamento bracket={bracket} players={players} playerId={me?.id} />
          <FimDoConfronto match={match} bracket={bracket} />
        </>
      )}

      {room && room.status === 'finished' && (
        <>
          <Chaveamento bracket={bracket} players={players} playerId={me?.id} />
          <Campeao
            championName={championName}
            fighter={room?.match?.fighters?.[champion] || null}
            souEu={champion === me?.id}
            isHost={isHost}
            onLeave={onLeave}
          />
        </>
      )}
    </section>
  )
}
