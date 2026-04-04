import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGameStore, useLocalPlayer } from '../store/gameStore'
import type { Player } from 'shared'
import cardFaceDown from '../assets/card-face-down.svg'
import cardFaceUp from '../assets/card-face-up.svg'
import chips from '../assets/chips.svg'

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(timerEndsAt: number | null) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!timerEndsAt) { setRemaining(null); return }
    const tick = () => setRemaining(Math.max(0, timerEndsAt - Date.now()))
    tick()
    const id = setInterval(tick, 100)
    return () => clearInterval(id)
  }, [timerEndsAt])

  return remaining
}

// ─── Player stat bar (always visible at bottom) ───────────────────────────────

function StatBar({ player }: { player: Player }) {
  const { t } = useTranslation()
  const sortedCards = [...player.cards].sort((a, b) => a - b)

  return (
    <div className="border-t-2 border-green-dark/10 bg-cream px-6 py-4 flex items-center gap-6 w-full h-15">
      {/* Chips */}
      <div className="flex items-center gap-2 shrink-0" m-4>
        <div
          style={{ marginLeft: '12px' }}
          className="w-[50px] h-[50px] overflow-hidden flex items-center justify-center">
          <img
            src={chips}
            alt="chips"
            className="w-full h-full object-contain scale-[1.2] drop-shadow ml-4"
          />
        </div>
        <span className="text-lg font-bold text-green-dark">{player.chips}</span>
      </div>

      <div>
        <span> | </span>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-wrap gap-1.5">
        {sortedCards.length === 0 ? (
          <span className="text-sm text-green-dark/30">{t('decision.noCardsYet')}</span>
        ) : (
          sortedCards.map(card => (
            <span
              key={card}
              style={{ padding: '5px' }}
              className="rounded border border-green-dark/20 shadow-sm bg-green-light/20 text-green-dark text-sm font-black"
            >
              {card}
            </span>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Name Entry (shown when player hasn't joined yet) ─────────────────────────

function NameEntry({ roomCode }: { roomCode: string }) {
  const { connect, joinRoom, resetGame, error } = useGameStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const navigate = useNavigate()

  useEffect(() => { connect() }, [connect])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    joinRoom(roomCode, trimmed)
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-green-dark">{t('lobby.title')}</h2>
          <p className="text-sm text-green-dark/40 mt-1">
            {t('lobby.roomCode')} <span className="font-mono font-semibold tracking-widest">{roomCode}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder={t('home.yourNamePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={20}
            autoFocus
            className="w-full h-14 rounded-2xl border-2 border-green-dark/20 bg-cream px-5 text-green-dark font-semibold placeholder:text-green-dark/30 focus:outline-none focus:border-green-dark/60 indent-4"
          />
          {error && <p className="text-red text-sm px-1">{error}</p>}
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full h-14 rounded-2xl bg-green-dark text-cream font-semibold text-lg hover:bg-green-dark/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t('home.joinRoom')}
          </button>
          <button
            onClick={() => { resetGame(); navigate('/') }}
            className="text-sm text-green-dark/40 hover:text-green-dark transition-colors underline underline-offset-4"
          >
            {t('gameover.backToHome')}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Lobby (waiting for host to start) ───────────────────────────────────────

function Lobby({ roomCode }: { roomCode: string }) {
  const { state, resetGame } = useGameStore()
  const { t } = useTranslation()
  const localPlayer = useLocalPlayer()
  const players = state?.players ?? []
  const navigate = useNavigate();

  return (
    <div style={{ padding: '10px' }}
      className="min-h-svh flex flex-col p-6 gap-6 sm:items-center sm:justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-6 sm:flex-row sm:gap-8">

        {/* Top (mobile) / Left (desktop) — Room code + self */}
        <div style={{ padding: '20px' }}
          className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-4 sm:gap-6 bg-green-dark/5 rounded-3xl sm:w-64 sm:shrink-0">
          <div className="text-center">
            <p className="text-xs font-semibold text-green-dark/60 uppercase tracking-widest">{t('lobby.roomCode')}</p>
            <p className="text-3xl sm:text-4xl font-bold text-green-dark tracking-[0.2em] font-mono">{roomCode}</p>
          </div>

          {localPlayer && (
            <div className="text-center">
              <p className="text-xs font-semibold text-green-dark/60 uppercase tracking-widest mb-1">{t('lobby.you')}</p>
              <p className="text-lg sm:text-xl font-bold text-green-dark">{localPlayer.name}</p>
              <p className="text-sm text-green-dark/40 mt-0.5">{t('lobby.seat', { n: localPlayer.seatIndex + 1 })}</p>
            </div>
          )}
        </div>

        {/* Bottom (mobile) / Right (desktop) — Player list + waiting */}
        <div className="flex-1 flex flex-col gap-4">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-dark">{t('lobby.title')}</h2>
              <p className="text-sm text-green-dark/40 mt-0.5">
                {players.length === 0
                  ? t('lobby.waiting')
                  : t('lobby.playerCount', { count: players.length })}
              </p>
            </div>
            {state && (
              <span className="text-s font-semibold text-green-dark/50 capitalize">{t(`difficulty.${state.difficulty}`)}</span>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-2">
            {players.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl border-2 border-dashed border-green-dark/10 flex items-center indent-4">
                  <span className="text-sm text-green-dark/20">{t('lobby.playerSlot', { n: i + 1 })}</span>
                </div>
              ))
            ) : (
              players.map((player, index) => {
                const isMe = player.id === localPlayer?.id
                return (
                  <div
                    key={player.id}
                    className={`relative flex items-center gap-4 pl-6 h-14 rounded-2xl border-2 transition-all w-full ${isMe ? 'border-green-dark bg-green-light/8' : 'border-green-dark/10 bg-cream'
                      }`}
                  >
                    <span
                      style={{ marginLeft: '24px' }}
                      className="w-6 h-6 rounded-full bg-green-dark/10 text-green-dark text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 flex items-center gap-2 min-w-0 pr-10">
                      <span className="font-semibold text-green-dark truncate">{player.name}</span>
                      {isMe && <span className="text-xs text-green-dark/40 font-normal shrink-0">{t('lobby.youIndicator')}</span>}
                    </div>
                    <span className={`absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${player.connected ? 'bg-green-light' : 'bg-red'}`} />
                  </div>
                )
              })
            )}
          </div>

          <div className="w-full h-14 rounded-2xl border-2 border-green-dark/10 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-dark/30 animate-pulse" />
            <span className="text-sm font-semibold text-green-dark/40">{t('lobby.waitingForHost')}</span>
          </div>

          <button
            onClick={() => { resetGame(); navigate('/') }}
            className="text-sm text-green-dark/40 hover:text-green-dark transition-colors underline underline-offset-4"
          >
            {t('gameover.backToHome')}
          </button>

        </div>
      </div>
    </div>
  )
}

// ─── Card Selection ───────────────────────────────────────────────────────────

function CardSelection({ player }: { player: Player }) {
  const { state, selectCard } = useGameStore()
  const { t } = useTranslation()
  const remaining = useCountdown(state?.timerEndsAt ?? null)

  if (!state) return null

  const activePlayer = state.players[state.activePlayerIndex]
  const isMyTurn = activePlayer.id === player.id
  const totalMs = 100000
  const timerPct = remaining !== null && state.timerEndsAt
    ? (remaining / totalMs) * 100
    : 100

  return (
    <div className="min-h-svh flex flex-col items-center justify-center">

      {/* Header */}
      <div
        style={{ padding: '12px' }}
        className="px-6 pt-8 pb-4 w-full mx-auto">
        {isMyTurn ? (
          <>
            <h2 className="text-2xl font-bold text-green-dark">{t('cardSelection.yourTurn')}</h2>
            <p className="text-sm text-green-dark/50 mt-1">{t('cardSelection.tapToReveal')}</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-green-dark">{t('cardSelection.waiting')}</h2>
            <p className="text-sm text-green-dark/50 mt-1">
              <span className="font-semibold text-green-dark">{activePlayer.name}</span> {t('cardSelection.pickingCard')}
            </p>
          </>
        )}

        {/* Cards remaining */}
        <p className="text-xs text-green-dark/30 mt-2">{t('cardSelection.cardsRemaining', { count: state.deck.length })}</p>

        {/* Timer bar */}
        {remaining !== null && (
          <div className="mt-3 h-1.5 rounded-full bg-green-dark/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange transition-all duration-100"
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Card grid */}
      <div style={{ padding: '10px' }}
        className="flex-1 px-6 pb-6 max-w-xl w-full mx-auto">
        <div className="grid grid-cols-6 gap-2 h-full">
          {state.deck.map((card) => (
            <button
              key={card}
              onClick={() => isMyTurn && selectCard(card)}
              disabled={!isMyTurn}
              className={`aspect-[2/3] rounded-xl overflow-hidden transition-all
                ${isMyTurn
                  ? 'hover:scale-105 active:scale-95 cursor-pointer opacity-100'
                  : 'cursor-default opacity-40'
                }`}
            >
              <img src={cardFaceDown} alt="card" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Stat bar */}
      <StatBar player={player} />
    </div>
  )
}

// ─── Decision ────────────────────────────────────────────────────────────────

function Decision({ player }: { player: Player }) {
  const { state, takeCard, noThanks } = useGameStore()
  const { t } = useTranslation()
  const remaining = useCountdown(state?.timerEndsAt ?? null)
  const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null)

  const activePlayer = state?.players[state.activePlayerIndex] ?? null

  useEffect(() => {
    setViewingPlayerId(null)
  }, [state?.activePlayerIndex])

  if (!state || state.activeCard === null || !activePlayer) return null

  const isMyTurn = activePlayer.id === player.id
  const canPass = player.chips > 0
  const isEasy = state.difficulty === 'easy'
  const isMedium = state.difficulty === 'medium'

  const viewingPlayer = (isEasy || isMedium)
    ? (state.players.find(p => p.id === viewingPlayerId) ?? activePlayer)
    : activePlayer
  const isViewingSelf = viewingPlayer.id === player.id
  const isViewingActive = viewingPlayer.id === activePlayer.id

  const totalMs = state.difficulty === 'hard' ? 15000 : 30000
  const timerPct = remaining !== null && state.timerEndsAt
    ? (remaining / totalMs) * 100
    : 100
  const isFrozen = state.difficulty !== 'easy' && state.timerEndsAt !== null
    && (remaining === null || (totalMs - remaining) < 5_000)

  const sortedViewingCards = [...viewingPlayer.cards].sort((a, b) => a - b)

  return (
    <div className="h-svh flex flex-col overflow-hidden">

      <div
        style={{ padding: '15px' }}
        className="flex-1 overflow-y-auto flex flex-col gap-6">

        {/* Header */}
        <div className="text-center sm:text-left shrink-0">
          {isMyTurn ? (
            <>
              <h2 className="text-3xl font-black text-green-dark tracking-tight">{t('decision.yourDecision')}</h2>
              <p className="text-base font-medium text-green-dark/60 mt-1">{t('decision.takeOrPay')}</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-green-dark tracking-tight">{t('decision.theirTurn', { name: activePlayer.name })}</h2>
              <p className="text-base font-medium text-green-dark/60 mt-1 flex items-center justify-center sm:justify-start gap-2">
                {t('decision.waitingForDecision')}
                <span className="animate-pulse">...</span>
              </p>
            </>
          )}
        </div>

        {/* Main Play Area */}
        <div style={{ padding: '20px' }}
          className="flex flex-row gap-5 items-stretch rounded-3xl shadow-sm border border-green-dark/10 shrink-0">

          {/* Left — Revealed Card & Chips */}
          <div className="flex flex-col items-center gap-4 shrink-0 w-32 sm:w-36">
            <div className="relative w-full aspect-[5/7] rounded-xl overflow-hidden shadow-md ring-1 ring-black/5">
              <img src={cardFaceUp} alt="active card" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-black text-green-dark drop-shadow-md">
                  {state.activeCard}
                </span>
              </div>
            </div>

            <div style={{ padding: '5px' }}
              className="flex items-center gap-2">
              <img src={chips} alt="chips" className="w-15 h-15 object-contain" />
              <span className="text-sm font-black text-orange">{state.chipsOnCard}</span>
            </div>
          </div>

          {/* Right — Player hand panel */}
          <div className="flex-1 flex flex-col gap-5 py-2">

            {/* Easy/medium mode: player picker dropdown */}
            {(isEasy || isMedium) ? (
              <select
                value={viewingPlayer.id}
                onChange={e => setViewingPlayerId(e.target.value)}
                style={{ padding: '3px' }}
                className="w-full rounded-xl border border-green-dark/20 bg-cream text-sm font-semibold text-green-dark focus:outline-none focus:border-green-dark/50 indent-4"
              >
                {state.players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.id === player.id ? ` ${t('lobby.youIndicator')}` : ''}{p.id === activePlayer.id ? ' ★' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[10px] font-bold text-green-dark/40 uppercase tracking-widest">
                {isViewingSelf ? t('decision.yourResources') : t('decision.theirResources', { name: viewingPlayer.name })}
              </p>
            )}

            {/* Chips */}
            {(isEasy || isViewingSelf || isViewingActive) && (
              <>
                <div>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-green-dark leading-none">{viewingPlayer.chips}</span>
                    <span className="text-sm font-medium text-green-dark/50 mb-1">
                      {t('decision.chip', { count: viewingPlayer.chips })}
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-green-dark/10"></div>
              </>
            )}

            {/* Collected cards */}
            <div className="flex-1">
              <p style={{ marginBottom: '10px' }}
                className="text-[10px] font-bold text-green-dark/40 uppercase tracking-widest">
                {isViewingActive ? t('decision.collectedCards') : t('decision.cards')}
              </p>
              {sortedViewingCards.length === 0 ? (
                <span className="text-sm font-medium italic text-green-dark/30">{t('decision.noCardsYet')}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sortedViewingCards.map(card => (
                    <span
                      key={card}
                      style={{ padding: '5px' }}
                      className="rounded border border-green-dark/20 shadow-sm bg-green-light/20 text-green-dark text-sm font-black"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls Area */}
        <div className="flex flex-col gap-4 mt-auto shrink-0 pb-4">
          {/* Timer bar */}
          {remaining !== null && (
            <div className="h-2 rounded-full bg-green-dark/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-100 linear ${timerPct < 25 ? 'bg-red-500' : 'bg-orange'}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          )}

          {/* Action buttons */}
          {isMyTurn && (
            <div className="flex flex-col gap-3">
              <button
                onClick={takeCard}
                disabled={isFrozen}
                className="w-full h-14 rounded-2xl bg-green-dark text-white font-bold text-lg shadow-md shadow-green-dark/20 hover:bg-green-dark/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFrozen ? t('decision.wait') : t('decision.takeCard')}
              </button>
              <button
                onClick={noThanks}
                disabled={!canPass || isFrozen}
                className="w-full h-14 rounded-2xl border-2 border-orange bg-white text-orange font-bold text-lg hover:bg-orange/5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isFrozen ? t('decision.wait') : canPass ? t('decision.noThanks') : t('decision.noChips')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 w-full">
        <StatBar player={player} />
      </div>

    </div>
  )
}

// ─── Game Over ────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
}

function GameOver({ player }: { player: Player }) {
  const { state, resetGame } = useGameStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  if (!state?.results) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <p className="text-green-dark font-semibold">{t('gameover.calculatingScores')}</p>
      </div>
    )
  }

  const myResult = state.results.find(r => r.playerToken === player.token)
  if (!myResult) return null

  const medals = ['🥇', '🥈', '🥉']
  const isWinner = myResult.rank === 1

  return (
    <div style={{ padding: '20px' }}
      className="min-h-svh flex flex-col gap-6 overflow-y-auto">

      {/* Personal result */}
      <div className="flex flex-col items-center gap-2 pt-4">
        <div className="text-6xl">{medals[myResult.rank - 1] ?? `#${myResult.rank}`}</div>
        <h2 className="text-3xl font-black text-green-dark">
          {isWinner ? t('gameover.youWon') : t('gameover.place', { ordinal: ordinal(myResult.rank), n: myResult.rank })}
        </h2>
        <p className="text-5xl font-black text-green-dark mt-1">{t('gameover.pts', { score: myResult.finalScore })}</p>
      </div>

      {/* Score breakdown */}
      <div style={{ padding: '10px' }}
        className="bg-cream rounded-2xl flex flex-col gap-3 border border-green-dark/10">
        <p className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('gameover.yourBreakdown')}</p>

        <div className="flex flex-col gap-2">
          {myResult.groups.length === 0 ? (
            <p className="text-sm text-green-dark/40 italic">{t('gameover.noCardsCollected')}</p>
          ) : myResult.groups.map((group, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex gap-1 flex-wrap">
                {group.cards.map((card, j) => (
                  <span
                    key={card}
                    style={{ padding: '2px' }}
                    className={`rounded border text-sm font-black ${j === 0
                      ? 'border-green-dark/40 bg-green-light/30 text-green-dark'
                      : 'border-green-dark/10 bg-green-dark/5 text-green-dark/40 line-through'
                      }`}
                  >
                    {card}
                  </span>
                ))}
              </div>
              <span className="text-sm font-bold text-green-dark ml-auto">+{group.score}</span>
            </div>
          ))}
        </div>

        <div className="w-full h-px bg-green-dark/10" />

        <div className="flex justify-between text-sm font-semibold text-green-dark">
          <span>{t('gameover.cardTotal')}</span>
          <span>{myResult.cardTotal}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold text-green-dark">
          <span>{t('gameover.chipsDeducted')}</span>
          <span>−{myResult.chips}</span>
        </div>
        <div className="flex justify-between text-base font-black text-green-dark">
          <span>{t('gameover.finalScore')}</span>
          <span>{myResult.finalScore}</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-green-dark/40 uppercase tracking-widest">{t('gameover.leaderboard')}</p>
        {state.results.map(result => {
          const p = state.players.find(pl => pl.token === result.playerToken)
          const isMe = result.playerToken === player.token
          return (
            <div
              key={result.playerToken}
              style={{ padding: '10px' }}
              className={`flex items-center gap-3 h-14 rounded-2xl border-2 transition-all ${isMe
                ? 'bg-green-dark text-cream border-green-dark'
                : 'bg-cream border-green-dark/10 text-green-dark'
                }`}
            >
              <span className="w-6 text-center font-black text-sm">
                {medals[result.rank - 1] ?? `#${result.rank}`}
              </span>
              <span className="flex-1 font-semibold truncate">
                {p?.name}{isMe ? ` ${t('gameover.youIndicator')}` : ''}
              </span>
              <span className="font-black">{t('gameover.pts', { score: result.finalScore })}</span>
            </div>
          )
        })}
        <button
          onClick={() => { resetGame(); navigate('/') }}
          className="text-sm text-green-dark/40 hover:text-green-dark transition-colors underline underline-offset-4"
        >
          {t('gameover.backToHome')}
        </button>
      </div>

    </div>
  )
}

// ─── Player Device (router) ───────────────────────────────────────────────────

export default function PlayerDevice() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { connect, state, roomClosed } = useGameStore()
  const { t } = useTranslation()
  const localPlayer = useLocalPlayer()
  const navigate = useNavigate()

  useEffect(() => { connect() }, [connect])

  useEffect(() => {
    if (roomClosed) navigate('/')
  }, [roomClosed, navigate])

  if (!roomCode) return null
  if (!localPlayer) return <NameEntry roomCode={roomCode} />
  if (state?.phase === 'lobby') return <Lobby roomCode={roomCode} />
  if (state?.phase === 'card-selection') return <CardSelection player={localPlayer} />
  if (state?.phase === 'decision') return <Decision player={localPlayer} />
  if (state?.phase === 'game-over') return <GameOver player={localPlayer} />

  return (
    <div className="min-h-svh flex items-center justify-center">
      <p className="text-green-dark font-semibold">{t('app.loading')}</p>
    </div>
  )
}
