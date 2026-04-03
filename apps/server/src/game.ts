import type { GameState, Player, Difficulty, GameMode, CardGroup, PlayerResult } from 'shared';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHIPS_BY_COUNT: Record<number, number> = {
  3: 11, 4: 11, 5: 11, 6: 9, 7: 7,
};

export const DECISION_TIMER_MS: Record<Difficulty, number | null> = {
  easy: null,
  medium: 30_000,
  hard: 15_000,
};

export const CARD_SELECT_TIMEOUT_MS = 10_000;
export const SPOTLIGHT_FREEZE_MS = 5_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    // generates a random index (j) that falls anywhere between 0 (the start of the array) and i (the current item's position)
    const j = Math.floor(Math.random() * (i + 1));

    //simply swaps the item at the current position (i) with the item at the randomly selected position (j)
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── State Factories ──────────────────────────────────────────────────────────

export function createState(roomCode: string, difficulty: Difficulty, mode: GameMode): GameState {
  return {
    roomCode,
    difficulty,
    mode,
    phase: 'lobby',
    players: [],
    deck: [],
    activeCard: null,
    chipsOnCard: 0,
    activePlayerIndex: 0,
    timerEndsAt: null,
    results: null,
  };
}

function computeResults(players: Player[]): PlayerResult[] {
  const withMeta = players.map(player => {
    const sorted = [...player.cards].sort((a, b) => a - b);
    const groups: CardGroup[] = [];
    for (const card of sorted) {
      const last = groups[groups.length - 1];
      if (last && card === last.cards[last.cards.length - 1] + 1) {
        last.cards.push(card);
      } else {
        groups.push({ cards: [card], score: card });
      }
    }
    const cardTotal = groups.reduce((sum, g) => sum + g.score, 0);
    const finalScore = cardTotal - player.chips;
    const minCard = sorted[0] ?? Infinity;
    return { player, groups, cardTotal, finalScore, minCard };
  });

  // Sort: final score ASC, then lowest single card ASC (tie-breaker)
  withMeta.sort((a, b) =>
    a.finalScore !== b.finalScore
      ? a.finalScore - b.finalScore
      : a.minCard - b.minCard
  );

  // Assign ranks — true tie only when both score AND min card are identical
  const results: PlayerResult[] = [];
  for (let i = 0; i < withMeta.length; i++) {
    const entry = withMeta[i];
    const prev = withMeta[i - 1];
    const rank = i === 0 ? 1
      : (entry.finalScore === prev.finalScore && entry.minCard === prev.minCard)
        ? results[i - 1].rank
        : i + 1;
    results.push({
      playerToken: entry.player.token,
      groups: entry.groups,
      cardTotal: entry.cardTotal,
      chips: entry.player.chips,
      finalScore: entry.finalScore,
      rank,
    });
  }
  return results;
}

export function initGame(state: GameState): GameState {
  // 33 cards (3–35), remove 9 at random, keep 24
  const fullDeck = Array.from({ length: 33 }, (_, i) => i + 3);
  const deck = shuffle(shuffle(fullDeck).slice(9));

  const chipCount = CHIPS_BY_COUNT[state.players.length];
  const players = state.players.map(p => ({ ...p, chips: chipCount, cards: [] }));
  const activePlayerIndex = Math.floor(Math.random() * players.length);

  return {
    ...state,
    phase: 'card-selection',
    deck,
    players,
    activeCard: null,
    chipsOnCard: 0,
    activePlayerIndex,
    timerEndsAt: null,
  };
}

// ─── Game Actions ─────────────────────────────────────────────────────────────

export function revealCard(state: GameState, card: number): GameState {
  const timerMs = DECISION_TIMER_MS[state.difficulty];
  return {
    ...state,
    phase: 'decision',
    deck: state.deck.filter(c => c !== card),
    activeCard: card,
    chipsOnCard: 0,
    timerEndsAt: timerMs ? Date.now() + timerMs : null,
  };
}

export function passCard(state: GameState): GameState {
  // update and deduct the chips of active player who pass the card
  const players = state.players.map((p, i) =>
    i === state.activePlayerIndex ? { ...p, chips: p.chips - 1 } : p
  );
  const nextIndex = (state.activePlayerIndex + 1) % players.length;
  const timerMs = DECISION_TIMER_MS[state.difficulty];

  return {
    ...state,
    players,
    chipsOnCard: state.chipsOnCard + 1,
    activePlayerIndex: nextIndex,
    timerEndsAt: timerMs ? Date.now() + timerMs : null,
  };
}

export function takeCard(state: GameState): GameState {
  const players = state.players.map((p, i) =>
    i === state.activePlayerIndex
      ? { ...p, cards: [...p.cards, state.activeCard!], chips: p.chips + state.chipsOnCard }
      : p
  );

  const isLastCard = state.deck.length === 0;
  const results = isLastCard ? computeResults(players) : null;
  return {
    ...state,
    phase: isLastCard ? 'game-over' : 'card-selection',
    players,
    activeCard: null,
    chipsOnCard: 0,
    timerEndsAt: null,
    results,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function scorePlayer(player: Player): number {
  const sorted = [...player.cards].sort((a, b) => a - b);
  let cardScore = 0;
  for (let i = 0; i < sorted.length; i++) {
    // Only count the lowest in a consecutive run
    if (i === 0 || sorted[i] !== sorted[i - 1] + 1) {
      cardScore += sorted[i];
    }
  }
  return cardScore - player.chips;
}
