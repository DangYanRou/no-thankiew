import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useGameStore } from '../store/gameStore'
import type { Player, GameState, PlayerResult, CardGroup } from 'shared'
import cardFaceDown from '../assets/card-face-down.svg'
import cardFaceUp from '../assets/card-face-up.svg'
import chips from '../assets/chips.svg'

// ─── Sortable Player Row ──────────────────────────────────────────────────────

function PlayerRow({ player, index, onRemove }: { player: Player; index: number; onRemove?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-4 w-full h-14 pl-5 rounded-2xl border-2 border-green-dark/10 bg-cream transition-shadow ${isDragging ? 'shadow-lg opacity-80' : ''
        }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="text-green-dark/30 hover:text-green-dark/60 cursor-grab active:cursor-grabbing select-none text-lg shrink-0"
      >
        ⠿
      </div>

      {/* Seat number */}
      <div className="w-6 h-6 rounded-full bg-green-dark/10 text-green-dark text-xs font-bold flex items-center justify-center shrink-0">
        {index + 1}
      </div>

      {/* Name */}
      <div className="flex-1 font-semibold text-green-dark truncate min-w-0 pr-10">
        {player.name}
      </div>

      {/* Remove button or connection dot */}
      {onRemove ? (
        <button
          onClick={onRemove}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-green-dark/8 flex items-center justify-center text-green-dark/40 hover:bg-red/10 hover:text-red transition-colors text-sm font-bold"
        >
          ✕
        </button>
      ) : (
        <div
          className={`absolute right-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${player.connected ? 'bg-green-light' : 'bg-red'
            }`}
        />
      )}
    </div>
  )
}

// ─── Game Over Scoreboard ─────────────────────────────────────────────────────

const MEDALS = ['🥇', '🥈', '🥉']

function GameOverScreen({ state }: { state: GameState }) {
  const navigate = useNavigate()
  const { resetGame } = useGameStore()
  const { t } = useTranslation()

  if (!state.results) {
    return (
      <div className="min-h-svh flex items-center justify-center">
        <p className="text-green-dark font-semibold">{t('gameover.calculatingScores')}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px' }}
      className="min-h-svh flex flex-col items-center justify-center gap-8">
      <div className="text-center">
        <div style={{ padding: '5px' }} className="text-6xl mb-3">🏆</div>
        <h1 style={{ padding: '5px' }} className="text-5xl font-black text-green-dark tracking-tight">{t('gameover.gameOver')}</h1>
        <p style={{ padding: '5px' }} className="text-green-dark/40 text-sm mt-2 uppercase tracking-widest font-semibold">{t('gameover.finalScoreboard')}</p>
      </div>

      <button
        onClick={() => { resetGame(); navigate('/') }}
        className="text-sm text-green-dark/40 hover:text-green-dark transition-colors underline underline-offset-4"
      >
        {t('gameover.backToHome')}
      </button>

      <div className="w-full max-w-2xl flex flex-col gap-3">
        {state.results.map((result: PlayerResult) => {
          const player = state.players.find((p: Player) => p.token === result.playerToken)
          const isWinner = result.rank === 1

          return (
            <div
              key={result.playerToken}
              style={{ padding: '10px' }}
              className={`flex items-center gap-5 rounded-2xl border-2 transition-all ${isWinner
                ? 'bg-green-dark text-cream border-green-dark h-20'
                : 'bg-cream text-green-dark border-green-dark/10 h-16'
                }`}
            >
              {/* Rank */}
              <span className="text-2xl w-8 text-center shrink-0">
                {MEDALS[result.rank - 1] ?? `#${result.rank}`}
              </span>

              {/* Name */}
              <span className={`flex-1 font-bold truncate ${isWinner ? 'text-xl' : 'text-base'}`}>
                {player?.name}
              </span>

              {/* Card groups */}
              <div className="flex gap-1 flex-wrap justify-end">
                {result.groups.map((group: CardGroup, i: number) => (
                  <div key={i} className="flex gap-0.5">
                    {group.cards.map((card: number, j: number) => (
                      <span
                        style={{ padding: '2px' }}
                        key={card}
                        className={`rounded text-xs font-black px-1 py-0.5 ${j === 0
                          ? isWinner
                            ? 'bg-cream/20 text-cream'
                            : 'bg-green-light/30 border border-green-dark/20 text-green-dark'
                          : isWinner
                            ? 'text-cream/30 line-through'
                            : 'text-green-dark/25 line-through'
                          }`}
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Score breakdown */}
              <div className={`text-right shrink-0 ${isWinner ? 'text-cream' : 'text-green-dark'}`}>
                <p className={`font-black leading-none ${isWinner ? 'text-3xl' : 'text-2xl'}`}>
                  {result.finalScore}
                </p>
                <p className={`text-xs mt-0.5 ${isWinner ? 'text-cream/60' : 'text-green-dark/40'}`}>
                  {result.cardTotal} − {result.chips} {t('gameover.chipsDeducted')}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

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

// ─── Player Stats Panel ───────────────────────────────────────────────────────

function PlayerStatsPanel({ state }: { state: GameState }) {
  const { t } = useTranslation()
  const isEasy = state.difficulty === 'easy'
  const isMedium = state.difficulty === 'medium'
  const activePlayer = state.players[state.activePlayerIndex]

  return (
    <div style={{ padding: '10px' }}
      className="flex flex-col gap-2 overflow-y-auto">
      {state.players.map((player, idx) => {
        const isActive = player.id === activePlayer.id
        const showCards = isEasy || isMedium || isActive
        const showChips = isEasy || isActive

        const sorted = [...player.cards].sort((a, b) => a - b)
        const groups: number[][] = []
        for (const card of sorted) {
          const last = groups[groups.length - 1]
          if (last && card === last[last.length - 1] + 1) last.push(card)
          else groups.push([card])
        }

        return (
          <div style={{ padding: '5px' }}
            key={player.id}
            className={`rounded-2xl border-2 transition-all min-h-[80px] ${isActive
              ? 'bg-green-dark text-cream border-green-dark'
              : 'bg-cream text-green-dark border-green-dark/10'
              }`}
          >
            {/* Name + chips */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-bold w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${isActive ? 'bg-cream/20 text-cream' : 'bg-green-dark/10 text-green-dark'
                }`}>
                {idx + 1}
              </span>
              <span className={`font-bold text-sm truncate flex-1 ${isActive ? 'text-cream' : 'text-green-dark'}`}>
                {player.name}
              </span>
              {showChips && (
                <span className={`text-xs font-black shrink-0 ${isActive ? 'text-cream/70' : 'text-orange'}`}>
                  {player.chips} {t('decision.chip', { count: player.chips })}
                </span>
              )}
            </div>

            {/* Cards */}
            {showCards && (
              <div style={{ marginTop: '5px' }}
                className="flex flex-wrap gap-0.5 min-h-[18px]">
                {groups.length === 0 ? (
                  <span className={`text-xs italic ${isActive ? 'text-cream/30' : 'text-green-dark/20'}`}>{t('game.noCardsYet')}</span>
                ) : groups.map((group, gi) => (
                  <div key={gi} className="flex gap-0.5">
                    {group.map((card, ci) => (
                      <span
                        key={card}
                        style={{ padding: '2px' }}
                        className={`text-xs font-black rounded px-1 py-0.5 ${ci === 0
                          ? isActive
                            ? 'bg-cream/20 text-cream'
                            : 'bg-green-light/40 border border-green-dark/20 text-green-dark'
                          : isActive
                            ? 'text-cream/30 line-through'
                            : 'text-green-dark/25 line-through'
                          }`}
                      >
                        {card}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Card Selection View ──────────────────────────────────────────────────────

function CardSelectionView({ state }: { state: GameState }) {
  const { selectCard } = useGameStore()
  const { t } = useTranslation()
  const activePlayer = state.players[state.activePlayerIndex]
  const isSingle = state.mode === 'single'
  const totalSlots = 24
  const remaining = state.deck.length

  return (
    <div className="flex-1 flex flex-col gap-6 items-center justify-center">
      <div className="text-center">
        <h2 className="text-3xl font-black text-green-dark">{activePlayer.name}</h2>
        <p className="text-green-dark/50 text-base mt-0.5">
          {isSingle ? t('game.tapCard') : t('game.choosingCard')}
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2 content-start max-w-[65%] mx-auto">
        {Array.from({ length: totalSlots }).map((_, i) =>
          i < remaining ? (
            isSingle ? (
              <button
                key={i}
                onClick={() => selectCard(state.deck[i])}
                className="aspect-[2/3] rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 cursor-pointer opacity-100"
              >
                <img src={cardFaceDown} alt="card" className="w-full h-full object-cover" />
              </button>
            ) : (
              <div key={i} className="aspect-[2/3] rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-95 opacity-100">
                <img src={cardFaceDown} alt="" className="w-full h-full object-cover" />
              </div>
            )
          ) : (
            <div key={i} className="aspect-[5/7] rounded-xl border-2 border-dashed border-green-dark/10" />
          )
        )}
      </div>

      <p className="text-xs text-green-dark/30 uppercase tracking-widest text-center">
        {t('game.cardsRemaining', { count: remaining, total: totalSlots })}
      </p>
    </div>
  )
}

// ─── Decision View (Spotlight) ────────────────────────────────────────────────

function DecisionView({ state }: { state: GameState }) {
  const { takeCard, noThanks } = useGameStore()
  const { t } = useTranslation()
  const activePlayer = state.players[state.activePlayerIndex]
  const isSingle = state.mode === 'single'
  const canPass = activePlayer.chips > 0
  const remaining = useCountdown(state.timerEndsAt)
  const totalMs = state.difficulty === 'hard' ? 15_000 : 30_000
  const timerPct = remaining !== null && state.timerEndsAt
    ? (remaining / totalMs) * 100
    : null
  const isFrozen = state.difficulty !== 'easy' && state.timerEndsAt !== null
    && (remaining === null || (totalMs - remaining) < 5_000)

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-black text-green-dark">{activePlayer.name}</h2>
        <p className="text-green-dark/50 text-base mt-0.5">{t('game.isDeciding')}</p>
      </div>

      {timerPct !== null && (
        <div>
          <div className="h-2 bg-green-dark/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${timerPct > 50 ? 'bg-green-dark' : timerPct > 20 ? 'bg-orange' : 'bg-red'
                }`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <p className="text-xs text-green-dark/40 mt-1">{t('game.secondsRemaining', { count: Math.ceil((remaining ?? 0) / 1000) })}</p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-row items-center justify-center gap-6 md:gap-10 max-w-lg w-full px-4">

          {/* LEFT SECTION: Card and Chips */}
          <div className="flex flex-col items-center gap-4 w-1/2 max-w-[180px]">
            <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden shadow-md ring-1 ring-black/5 min-h-[150px]">
              <img src={cardFaceUp} alt="active card" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-black text-green-dark drop-shadow-md">
                  {state.activeCard}
                </span>
              </div>
            </div>
            <div
              style={{ padding: '5px' }}
              className="flex items-center gap-2"
            >
              <img src={chips} alt="chips" className="w-30 h-30 object-contain" />
              <span className="text-xl font-black text-orange">{state.chipsOnCard}</span>
            </div>
          </div>

          {/* RIGHT SECTION: Action Buttons */}
          {isSingle && (
            <div className="flex flex-col justify-center gap-4 w-1/2">
              <button
                onClick={takeCard}
                disabled={isFrozen}
                style={{ padding: '5px' }}
                className="w-full h-14 rounded-2xl bg-green-dark text-cream font-bold text-lg shadow-md hover:bg-green-dark/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFrozen ? t('game.wait') : t('game.takeCard')}
              </button>
              <button
                onClick={noThanks}
                disabled={!canPass || isFrozen}
                style={{ padding: '5px' }}
                className="w-full h-auto min-h-[56px] rounded-2xl border-2 border-orange bg-cream text-orange font-bold text-[15px] sm:text-lg leading-tight hover:bg-orange/5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:border-green-dark/20 disabled:text-green-dark/30 disabled:cursor-not-allowed"
              >
                {isFrozen ? t('game.wait') : canPass ? t('game.noThanks') : t('game.noChips')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── In-Game Layout ───────────────────────────────────────────────────────────

function InGameView({ state }: { state: GameState }) {
  const navigate = useNavigate()
  const { endGame } = useGameStore()
  const { t } = useTranslation()

  return (
    <div className="min-h-svh flex">
      {/* Left: game area */}
      <div style={{ padding: '10px' }}
        className="flex-1 flex flex-col p-10">
        {state.phase === 'card-selection'
          ? <CardSelectionView state={state} />
          : <DecisionView state={state} />
        }
      </div>

      {/* Right: player stats sidebar */}
      <div style={{ padding: '10px' }}
        className="w-72 shrink-0 bg-green-dark/5 border-l border-green-dark/10 flex flex-col gap-4 min-w-[40%]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-green-dark/40 uppercase tracking-widest">{t('game.players')}</p>
          <button
            onClick={() => {
              if (window.confirm(t('game.endGameConfirm'))) {
                endGame()
                navigate('/')
              }
            }}
            className="text-xs font-semibold text-red/60 hover:text-red transition-colors"
          >
            {t('game.endGame')}
          </button>
        </div>
        <PlayerStatsPanel state={state} />
      </div>
    </div>
  )
}

// ─── Multi-device lobby ───────────────────────────────────────────────────────

function MultiLobby({ roomCode, players, state, onDragEnd, onStart }: {
  roomCode: string
  players: Player[]
  state: GameState | null
  onDragEnd: (e: DragEndEvent) => void
  onStart: () => void
}) {
  const { removePlayer } = useGameStore()
  const { t } = useTranslation()
  const joinUrl = `${window.location.origin}/play/${roomCode}`
  const canStart = players.length >= 3 && players.length <= 7
  const needMore = 3 - players.length
  const navigate = useNavigate()
  const { endGame } = useGameStore()
  const { resetGame } = useGameStore()

  return (
    <div className="w-full max-w-4xl flex gap-8">
      {/* Left — QR code + room code */}
      <div className="flex flex-col items-center justify-center gap-6 bg-green-dark/5 rounded-3xl p-10 w-72 shrink-0 min-h-[380px]">
        <p className="text-xs font-semibold text-green-dark/60 uppercase tracking-widest">{t('lobby.scanToJoin')}</p>
        <div className="p-4 bg-cream rounded-2xl shadow-sm">
          <QRCodeSVG value={joinUrl} size={180} fgColor="#237227" bgColor="#f8f3e1" />
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-green-dark/60 uppercase tracking-widest mb-2">{t('lobby.roomCode')}</p>
          <p className="text-4xl font-bold text-green-dark tracking-[0.2em] font-mono">{roomCode}</p>
        </div>
        <span className="text-xs text-green-dark text-center break-all">{joinUrl}</span>
      </div>

      {/* Right — player list + start */}
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
              <div key={i} className="h-14 rounded-2xl border-2 border-dashed border-green-dark/10 flex items-center indent-4 pr-4">
                <span className="text-sm text-green-dark/20">{t('lobby.playerSlot', { n: i + 1 })}</span>
              </div>
            ))
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {players.map((player, index) => (
                  <PlayerRow key={player.id} player={player} index={index} onRemove={() => removePlayer(player.token)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {players.length > 0 && players.length < 3 && (
          <p className="text-xs text-green-dark/40 text-center">
            {t('lobby.needMore', { count: needMore })}
          </p>
        )}

        <button
          onClick={onStart}
          disabled={!canStart}
          className="w-full h-14 rounded-2xl bg-green-dark text-cream font-semibold text-lg hover:bg-green-dark/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('lobby.startGame')}
        </button>

        <button
          onClick={() => {
            if (!window.confirm(t('game.endGameConfirm'))) return
            endGame()
            resetGame()
            navigate('/')
          }}
          className="text-sm text-red/50 hover:text-red transition-colors underline underline-offset-4"
        >
          {t('game.endGame')}
        </button>
      </div>
    </div>
  )
}

// ─── Single-device lobby ──────────────────────────────────────────────────────

function SingleLobby({ players, state, onDragEnd, onStart }: {
  players: Player[]
  state: GameState | null
  onDragEnd: (e: DragEndEvent) => void
  onStart: () => void
}) {
  const { addPlayer, removePlayer } = useGameStore()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const canStart = players.length >= 3 && players.length <= 7
  const needMore = 3 - players.length

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || players.length >= 7) return
    addPlayer(trimmed)
    setName('')
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-dark">{t('lobby.addPlayers')}</h2>
          <p className="text-sm text-green-dark/40 mt-0.5">
            {players.length === 0
              ? t('lobby.addPlayersHint')
              : t('lobby.playerStatus', { count: players.length, difficulty: t(`difficulty.${state?.difficulty ?? 'medium'}`) })}
          </p>
        </div>
      </div>

      {/* Add player form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          type="text"
          placeholder={t('lobby.playerNamePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={20}
          autoFocus
          className="flex-1 h-12 rounded-2xl border-2 border-green-dark/20 bg-cream px-5 text-green-dark font-semibold placeholder:text-green-dark/30 focus:outline-none focus:border-green-dark/60 indent-4"
        />
        <button
          type="submit"
          disabled={!name.trim() || players.length >= 7}
          style={{ padding: '5px' }}
          className="h-12 px-6 rounded-xl bg-green-dark text-cream font-semibold hover:bg-green-dark/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {t('lobby.add')}
        </button>
      </form>

      {/* Player list */}
      <div className="flex flex-col gap-2">
        {players.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl border-2 border-dashed border-green-dark/10 flex items-center indent-4">
              <span className="text-sm text-green-dark/20">{t('lobby.playerSlot', { n: i + 1 })}</span>
            </div>
          ))
        ) : (
          <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={players.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {players.map((player, index) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={index}
                  onRemove={() => removePlayer(player.token)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {players.length > 0 && players.length < 3 && (
        <p className="text-xs text-green-dark/40 text-center">
          {t('lobby.needMore', { count: needMore })}
        </p>
      )}

      <button
        onClick={onStart}
        disabled={!canStart}
        className="w-full h-14 rounded-2xl bg-green-dark text-cream font-semibold text-lg hover:bg-green-dark/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {t('lobby.startGame')}
      </button>
    </div>
  )
}

// ─── Master Screen ────────────────────────────────────────────────────────────

export default function MasterScreen() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const { connect, reorderSeats, startGame, state } = useGameStore()

  const players = state?.players ?? []

  useEffect(() => { connect() }, [connect])

  if (state?.phase === 'game-over') return <GameOverScreen state={state} />
  if (state?.phase === 'card-selection' || state?.phase === 'decision') return <InGameView state={state} />

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = players.findIndex(p => p.id === active.id)
    const newIndex = players.findIndex(p => p.id === over.id)
    const reordered = arrayMove(players, oldIndex, newIndex)
    reorderSeats(reordered.map(p => p.id))
  }

  return (
    <div className="min-h-svh flex items-center justify-center p-8">
      {state?.mode === 'single' ? (
        <SingleLobby
          players={players}
          state={state}
          onDragEnd={handleDragEnd}
          onStart={startGame}
        />
      ) : (
        <MultiLobby
          roomCode={roomCode ?? ''}
          players={players}
          state={state}
          onDragEnd={handleDragEnd}
          onStart={startGame}
        />
      )}
    </div>
  )
}
