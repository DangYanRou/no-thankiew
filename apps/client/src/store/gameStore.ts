import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents, GameState, Difficulty, GameMode } from 'shared'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

interface GameStore {
  socket: AppSocket | null
  state: GameState | null
  roomCode: string | null
  playerToken: string | null
  isHost: boolean
  error: string | null
  roomClosed: boolean

  connect: () => void
  disconnect: () => void
  resetGame: () => void

  createRoom: (difficulty: Difficulty, mode: GameMode) => void
  reorderSeats: (orderedPlayerIds: string[]) => void
  startGame: () => void
  endGame: () => void
  addPlayer: (name: string) => void
  removePlayer: (playerToken: string) => void

  joinRoom: (roomCode: string, name: string) => void
  selectCard: (card: number) => void
  takeCard: () => void
  noThanks: () => void
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? `http://${window.location.hostname}:3001`
const SESSION_KEY = 'no-thankiew-session'

interface StoredSession {
  token: string
  roomCode: string
  name: string
}

function saveSession(s: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s))
}

function loadSession(): StoredSession | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null')
  } catch {
    return null
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export const useGameStore = create<GameStore>((set, get) => ({
  socket: null,
  state: null,
  roomCode: null,
  playerToken: null,
  isHost: false,
  error: null,
  roomClosed: false,

  connect() {
    if (get().socket) return

    const socket: AppSocket = io(SOCKET_URL, { autoConnect: true })

    socket.on('connect', () => {
      const session = loadSession()
      if (session) {
        socket.emit('room:join', {
          roomCode: session.roomCode,
          name: session.name,
          token: session.token,
        })
      }
    })

    socket.on('state:update', (state) => {
      if (state.phase === 'game-over') clearSession()
      set({ state, roomCode: state.roomCode })
    })

    socket.on('room:created', ({ roomCode }) => {
      set({ roomCode, isHost: true })
    })

    socket.on('room:joined', ({ token, state }) => {
      const player = state.players.find(p => p.token === token)
      const name = player?.name ?? loadSession()?.name ?? ''
      saveSession({ token, roomCode: state.roomCode, name })
      set({ playerToken: token, state, roomCode: state.roomCode, error: null })
    })

    socket.on('room:closed', () => {
      clearSession()
      set({ roomClosed: true, state: null, roomCode: null })
    })

    socket.on('room:error', (message) => {
      // If there was a saved session but the room is gone, clear the stale data
      if (loadSession()) clearSession()
      set({ error: message })
    })

    socket.on('game:over', (state) => {
      clearSession()
      set({ state })
    })

    set({ socket })
  },

  disconnect() {
    get().socket?.disconnect()
    set({ socket: null, state: null, roomCode: null, error: null })
  },

  resetGame() {
    set({ state: null, roomCode: null, isHost: false, playerToken: null, error: null, roomClosed: false })
  },

  createRoom(difficulty, mode) {
    get().socket?.emit('room:create', { difficulty, mode })
  },

  reorderSeats(orderedPlayerIds) {
    get().socket?.emit('game:reorder-seats', orderedPlayerIds)
  },

  startGame() {
    get().socket?.emit('game:start')
  },

  endGame() {
    get().socket?.emit('game:end')
  },

  addPlayer(name) {
    get().socket?.emit('game:add-player', name)
  },

  removePlayer(playerToken) {
    get().socket?.emit('game:remove-player', playerToken)
  },

  joinRoom(roomCode, name) {
    const token = loadSession()?.token ?? ''
    get().socket?.emit('room:join', { roomCode, name, token })
  },

  selectCard(card) {
    get().socket?.emit('game:select-card', card)
  },

  takeCard() {
    get().socket?.emit('game:take-card')
  },

  noThanks() {
    get().socket?.emit('game:no-thanks')
  },
}))

export function useLocalPlayer() {
  return useGameStore((s) => {
    if (!s.state || !s.playerToken) return null
    return s.state.players.find(p => p.token === s.playerToken) ?? null
  })
}
