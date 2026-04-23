import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, GameState, Difficulty, GameMode } from 'shared';
import {
  createState, initGame, revealCard, passCard, takeCard,
  CARD_SELECT_TIMEOUT_MS, SPOTLIGHT_FREEZE_MS, DECISION_TIMER_MS,
} from './game';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? '*',
    methods: ['GET', 'POST'],
  },
});

const MAX_ROOMS = 100;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface RoomData {
  state: GameState;
  hostSocketId: string;
  decisionStartedAt: number | null;
  cardSelectTimer: ReturnType<typeof setTimeout> | null;
  decisionTimer: ReturnType<typeof setTimeout> | null;
  tokenMap: Map<string, string>; // token → socket id
  createdAt: number;
}

const rooms = new Map<string, RoomData>();

// Purge rooms older than ROOM_TTL_MS every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      clearTimers(room);
      io.to(code).emit('room:closed');
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000);

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function clearTimers(room: RoomData) {
  if (room.cardSelectTimer) clearTimeout(room.cardSelectTimer);
  if (room.decisionTimer) clearTimeout(room.decisionTimer);
  room.cardSelectTimer = null;
  room.decisionTimer = null;
}

function broadcast(roomCode: string, state: GameState) {
  io.to(roomCode).emit('state:update', state);
}

function getActiveRoom(socket: { rooms: Set<string>; id: string }) {
  for (const r of socket.rooms) {
    if (r !== socket.id && rooms.has(r)) return r;
  }
  return undefined;
}

function startDecisionTimer(roomCode: string, room: RoomData) {
  const timerMs = DECISION_TIMER_MS[room.state.difficulty];
  if (!timerMs) return;

  room.decisionTimer = setTimeout(() => {
    const r = rooms.get(roomCode);
    if (!r || r.state.phase !== 'decision') return;

    r.state = takeCard(r.state);
    rooms.set(roomCode, r);

    if (r.state.phase === 'game-over') {
      io.to(roomCode).emit('game:over', r.state);
    } else {
      broadcast(roomCode, r.state);
      startCardSelectTimer(roomCode, r);
    }
  }, timerMs);
}

function startCardSelectTimer(roomCode: string, room: RoomData) {
  if (room.state.difficulty === 'easy') return;

  room.cardSelectTimer = setTimeout(() => {
    const r = rooms.get(roomCode);
    if (!r || r.state.phase !== 'card-selection') return;

    const card = r.state.deck[Math.floor(Math.random() * r.state.deck.length)];
    r.state = revealCard(r.state, card);
    r.decisionStartedAt = Date.now();
    rooms.set(roomCode, r);
    broadcast(roomCode, r.state);
    startDecisionTimer(roomCode, r);
  }, CARD_SELECT_TIMEOUT_MS);
}

io.on('connection', (socket) => {

  socket.on('room:create', ({ difficulty, mode }: { difficulty: Difficulty; mode: GameMode }) => {
    for (const r of socket.rooms) {
      if (r !== socket.id) socket.leave(r);
    }

    if (rooms.size >= MAX_ROOMS) return socket.emit('room:error', 'Server is at capacity. Try again later.');

    const roomCode = generateCode();
    const state = createState(roomCode, difficulty, mode);
    rooms.set(roomCode, {
      state,
      hostSocketId: socket.id,
      decisionStartedAt: null,
      cardSelectTimer: null,
      decisionTimer: null,
      tokenMap: new Map(),
      createdAt: Date.now(),
    });
    socket.join(roomCode);
    socket.emit('room:created', { roomCode });
    socket.emit('state:update', state);
  });

  socket.on('room:join', ({ roomCode, name, token }) => {
    const room = rooms.get(roomCode);
    if (!room) return socket.emit('room:error', 'Room not found.');

    if (token) {
      const existing = room.state.players.find(p => p.token === token);
      if (existing) {
        room.state = {
          ...room.state,
          players: room.state.players.map(p =>
            p.token === token ? { ...p, id: socket.id, connected: true } : p
          ),
        };
        room.tokenMap.set(token, socket.id);
        socket.join(roomCode);
        socket.emit('room:joined', { token, state: room.state });
        broadcast(roomCode, room.state);
        return;
      }
    }

    if (room.state.phase !== 'lobby') return socket.emit('room:error', 'Game already in progress.');
    if (room.state.players.length >= 7) return socket.emit('room:error', 'Room is full.');

    const playerToken = generateToken();
    const player = {
      id: socket.id,
      token: playerToken,
      name,
      chips: 0,
      cards: [],
      seatIndex: room.state.players.length,
      connected: true,
    };
    room.state = { ...room.state, players: [...room.state.players, player] };
    room.tokenMap.set(playerToken, socket.id);
    socket.join(roomCode);
    socket.emit('room:joined', { token: playerToken, state: room.state });
    broadcast(roomCode, room.state);
  });

  socket.on('game:reorder-seats', (orderedPlayerIds) => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;

    const players = orderedPlayerIds.map((id, index) => {
      const p = room.state.players.find(p => p.id === id)!;
      return { ...p, seatIndex: index };
    });
    room.state = { ...room.state, players };
    broadcast(roomCode, room.state);
  });

  socket.on('game:add-player', (name: string) => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.state.mode !== 'single' || room.state.phase !== 'lobby') return;
    if (room.state.players.length >= 7) return;

    const token = generateToken();
    const player = {
      id: `virtual-${token}`,
      token,
      name: name.trim(),
      chips: 0,
      cards: [],
      seatIndex: room.state.players.length,
      connected: true,
    };
    room.state = { ...room.state, players: [...room.state.players, player] };
    broadcast(roomCode, room.state);
  });

  socket.on('game:remove-player', (playerToken: string) => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.state.phase !== 'lobby') return;

    const filtered = room.state.players.filter(p => p.token !== playerToken);
    room.state = { ...room.state, players: filtered.map((p, i) => ({ ...p, seatIndex: i })) };
    broadcast(roomCode, room.state);
  });

  socket.on('game:end', () => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;

    clearTimers(room);
    io.to(roomCode).emit('room:closed');
    rooms.delete(roomCode);
  });

  socket.on('game:start', () => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.hostSocketId !== socket.id) return;
    if (room.state.players.length < 3 || room.state.players.length > 7) return;

    room.state = initGame(room.state);
    rooms.set(roomCode, room);
    broadcast(roomCode, room.state);
    startCardSelectTimer(roomCode, room);
  });

  socket.on('game:select-card', (card) => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.state.phase !== 'card-selection') return;
    const canAct = room.state.mode === 'single'
      ? room.hostSocketId === socket.id
      : room.state.players[room.state.activePlayerIndex].id === socket.id;
    if (!canAct) return;
    if (!room.state.deck.includes(card)) return;

    clearTimers(room);
    room.state = revealCard(room.state, card);
    room.decisionStartedAt = Date.now();
    rooms.set(roomCode, room);
    broadcast(roomCode, room.state);
    startDecisionTimer(roomCode, room);
  });

  socket.on('game:no-thanks', () => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.state.phase !== 'decision') return;
    const activePlayer = room.state.players[room.state.activePlayerIndex];
    const canAct = room.state.mode === 'single'
      ? room.hostSocketId === socket.id
      : activePlayer.id === socket.id;
    if (!canAct) return;
    if (activePlayer.chips === 0) return;

    if (room.state.difficulty !== 'easy' && room.decisionStartedAt && Date.now() - room.decisionStartedAt < SPOTLIGHT_FREEZE_MS) return;

    clearTimers(room);
    room.state = passCard(room.state);
    room.decisionStartedAt = Date.now();
    rooms.set(roomCode, room);
    broadcast(roomCode, room.state);
    startDecisionTimer(roomCode, room);
  });

  socket.on('game:take-card', () => {
    const roomCode = getActiveRoom(socket);
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room || room.state.phase !== 'decision') return;
    const canAct = room.state.mode === 'single'
      ? room.hostSocketId === socket.id
      : room.state.players[room.state.activePlayerIndex].id === socket.id;
    if (!canAct) return;

    if (room.state.difficulty !== 'easy' && room.decisionStartedAt && Date.now() - room.decisionStartedAt < SPOTLIGHT_FREEZE_MS) return;

    clearTimers(room);
    room.state = takeCard(room.state);
    rooms.set(roomCode, room);

    if (room.state.phase === 'game-over') {
      console.log('[game-over] results:', room.state.results?.length ?? 'NULL');
      io.to(roomCode).emit('game:over', room.state);
    } else {
      broadcast(roomCode, room.state);
      startCardSelectTimer(roomCode, room);
    }
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.state.players.find(p => p.id === socket.id);
      if (player) {
        room.state = {
          ...room.state,
          players: room.state.players.map(p =>
            p.id === socket.id ? { ...p, connected: false } : p
          ),
        };
        broadcast(room.state.roomCode, room.state);
      }
    }
  });
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
