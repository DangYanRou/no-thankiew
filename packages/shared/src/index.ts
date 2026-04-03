// ─── Enums ────────────────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'multi' | 'single';

export type GamePhase =
  | 'lobby'
  | 'card-selection'
  | 'decision'
  | 'game-over';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Player {
  id: string;          // socket id
  token: string;       // persisted token for reconnection
  name: string;
  chips: number;
  cards: number[];     // card values collected
  seatIndex: number;   // order around the table
  connected: boolean;
}

export interface CardGroup {
  cards: number[];  // consecutive run, sorted
  score: number;    // = lowest card (only this card counts toward total)
}

export interface PlayerResult {
  playerToken: string;
  groups: CardGroup[];
  cardTotal: number;
  chips: number;
  finalScore: number;  // cardTotal - chips
  rank: number;        // 1-based; ties share the same rank
}

export interface GameState {
  roomCode: string;
  difficulty: Difficulty;
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  deck: number[];            // remaining face-down cards (grid)
  activeCard: number | null; // card currently being decided on
  chipsOnCard: number;       // chips accumulated on the active card
  activePlayerIndex: number;
  timerEndsAt: number | null; // Unix ms timestamp, null if no timer
  results: PlayerResult[] | null;
}

// ─── Socket Events: Client → Server ───────────────────────────────────────────

export interface ClientToServerEvents {
  'room:create': (payload: { difficulty: Difficulty; mode: GameMode }) => void;
  'room:join': (payload: { roomCode: string; name: string; token: string }) => void;
  'game:start': () => void;
  'game:end': () => void;
  'game:reorder-seats': (orderedPlayerIds: string[]) => void;
  'game:add-player': (name: string) => void;
  'game:remove-player': (playerToken: string) => void;
  'game:select-card': (card: number) => void;
  'game:take-card': () => void;
  'game:no-thanks': () => void;
}

// ─── Socket Events: Server → Client ───────────────────────────────────────────

export interface ServerToClientEvents {
  'room:created': (payload: { roomCode: string }) => void;
  'room:joined': (payload: { token: string; state: GameState }) => void;
  'room:closed': () => void;
  'room:error': (message: string) => void;
  'state:update': (state: GameState) => void;
  'game:over': (state: GameState) => void;
}
