export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameMode = 'multi' | 'single';

export type GamePhase =
  | 'lobby'
  | 'card-selection'
  | 'decision'
  | 'game-over';

export interface Player {
  id: string;
  token: string;
  name: string;
  chips: number;
  cards: number[];
  seatIndex: number;
  connected: boolean;
}

export interface CardGroup {
  cards: number[];
  score: number;    // lowest card
}

export interface PlayerResult {
  playerToken: string;
  groups: CardGroup[];
  cardTotal: number;
  chips: number;
  finalScore: number;
  rank: number;
}

export interface GameState {
  roomCode: string;
  difficulty: Difficulty;
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  deck: number[];
  activeCard: number | null;
  chipsOnCard: number;
  activePlayerIndex: number;
  timerEndsAt: number | null;
  results: PlayerResult[] | null;
}

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

export interface ServerToClientEvents {
  'room:created': (payload: { roomCode: string }) => void;
  'room:joined': (payload: { token: string; state: GameState }) => void;
  'room:closed': () => void;
  'room:error': (message: string) => void;
  'state:update': (state: GameState) => void;
  'game:over': (state: GameState) => void;
}
