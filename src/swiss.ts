// Swiss-system tournament logic. Pure functions, no React.

export type Item = { id: string; name: string };

/** A match between `a` and `b`. `b === null` means `a` received a bye. */
export type Match = { a: string; b: string | null; winner: string | null; round: number };

export type TournamentState = {
  items: Item[];
  /** Decided matches (including byes), in the order they were played. */
  matches: Match[];
  /** Current round number (1-based). */
  round: number;
  /** Undecided matches of the current round. */
  pending: Match[];
  /** True once every pair of items has met; no more rounds are generated. */
  complete: boolean;
};

export type Standing = {
  item: Item;
  score: number;
  buchholz: number;
  wins: number;
  losses: number;
  byes: number;
};

export type Rng = () => number;

const pairKey = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

export const totalPairs = (n: number) => (n * (n - 1)) / 2;

export const recommendedRounds = (n: number) => (n < 2 ? 0 : Math.ceil(Math.log2(n)));

function playedPairs(matches: Match[]): Set<string> {
  const set = new Set<string>();
  for (const m of matches) if (m.b !== null) set.add(pairKey(m.a, m.b));
  return set;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Score: 1 per win, 1 per bye. Tiebreaks: Buchholz, head-to-head, name. */
export function computeStandings(items: Item[], matches: Match[]): Standing[] {
  const rows = new Map<string, Standing>(
    items.map((item) => [item.id, { item, score: 0, buchholz: 0, wins: 0, losses: 0, byes: 0 }]),
  );

  for (const m of matches) {
    if (m.winner === null) continue;
    if (m.b === null) {
      const r = rows.get(m.a);
      if (r) {
        r.byes++;
        r.score++;
      }
      continue;
    }
    const loser = m.winner === m.a ? m.b : m.a;
    const w = rows.get(m.winner);
    const l = rows.get(loser);
    if (w) {
      w.wins++;
      w.score++;
    }
    if (l) l.losses++;
  }

  // Buchholz: sum of the final scores of every opponent faced (byes excluded).
  for (const m of matches) {
    if (m.winner === null || m.b === null) continue;
    const ra = rows.get(m.a);
    const rb = rows.get(m.b);
    if (ra && rb) {
      ra.buchholz += rb.score;
      rb.buchholz += ra.score;
    }
  }

  const headToHead = (x: string, y: string): number => {
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m.b === null || m.winner === null) continue;
      if (pairKey(m.a, m.b) === pairKey(x, y)) return m.winner === x ? -1 : 1;
    }
    return 0;
  };

  return [...rows.values()].sort(
    (p, q) =>
      q.score - p.score ||
      q.buchholz - p.buchholz ||
      headToHead(p.item.id, q.item.id) ||
      p.item.name.localeCompare(q.item.name),
  );
}

/**
 * Pair `order` (best first) so that nobody meets a previous opponent, preferring
 * partners close in the standings. Backtracking search with a step budget.
 */
function pairWithoutRematches(order: string[], met: Set<string>, budget: { steps: number }): [string, string][] | null {
  if (order.length === 0) return [];
  const [first, ...rest] = order;
  for (let i = 0; i < rest.length; i++) {
    if (--budget.steps < 0) return null;
    const partner = rest[i];
    if (met.has(pairKey(first, partner))) continue;
    const remaining = rest.filter((_, j) => j !== i);
    const sub = pairWithoutRematches(remaining, met, budget);
    if (sub) return [[first, partner], ...sub];
  }
  return null;
}

/**
 * Fallback when no complete rematch-free pairing exists: greedily pair items that
 * haven't met; items without an available new opponent sit this round out.
 */
function pairGreedy(order: string[], met: Set<string>): [string, string][] {
  const used = new Set<string>();
  const pairs: [string, string][] = [];
  for (const p of order) {
    if (used.has(p)) continue;
    const q = order.find((x) => x !== p && !used.has(x) && !met.has(pairKey(p, x)));
    if (q === undefined) continue;
    used.add(p).add(q);
    pairs.push([p, q]);
  }
  return pairs;
}

function startNextRound(items: Item[], matches: Match[], round: number, rng: Rng): TournamentState {
  const met = playedPairs(matches);
  if (items.length < 2 || met.size >= totalPairs(items.length)) {
    return { items, matches, round, pending: [], complete: true };
  }

  const nextRound = round + 1;
  const order =
    nextRound === 1
      ? shuffle(items.map((i) => i.id), rng)
      : computeStandings(items, matches).map((s) => s.item.id);

  // Bye candidates: lowest-ranked first, preferring items that haven't had a bye yet.
  let byeCandidates: (string | null)[] = [null];
  if (order.length % 2 === 1) {
    const hadBye = new Set(matches.filter((m) => m.b === null).map((m) => m.a));
    const reversed = [...order].reverse();
    byeCandidates = [...reversed.filter((id) => !hadBye.has(id)), ...reversed.filter((id) => hadBye.has(id))];
  }

  const budget = { steps: 50_000 };
  for (const byeId of byeCandidates) {
    const rest = order.filter((id) => id !== byeId);
    const pairs = pairWithoutRematches(rest, met, budget);
    if (pairs) {
      const byeMatch: Match[] = byeId ? [{ a: byeId, b: null, winner: byeId, round: nextRound }] : [];
      return {
        items,
        matches: [...matches, ...byeMatch],
        round: nextRound,
        pending: pairs.map(([a, b]) => ({ a, b, winner: null, round: nextRound })),
        complete: false,
      };
    }
    if (budget.steps < 0) break;
  }

  const pairs = pairGreedy(order, met);
  return {
    items,
    matches,
    round: nextRound,
    pending: pairs.map(([a, b]) => ({ a, b, winner: null, round: nextRound })),
    complete: false,
  };
}

export function createTournament(items: Item[], rng: Rng = Math.random): TournamentState {
  return startNextRound(items, [], 0, rng);
}

/** Record the winner of the first pending match; starts the next round when this one is done. */
export function recordResult(state: TournamentState, winnerId: string, rng: Rng = Math.random): TournamentState {
  const [current, ...rest] = state.pending;
  if (!current || (winnerId !== current.a && winnerId !== current.b)) return state;
  const matches = [...state.matches, { ...current, winner: winnerId }];
  if (rest.length > 0) return { ...state, matches, pending: rest };
  return startNextRound(state.items, matches, state.round, rng);
}
