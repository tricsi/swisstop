import { describe, expect, it } from 'vitest';
import {
  computeStandings,
  createTournament,
  recommendedRounds,
  recordResult,
  totalPairs,
  type Item,
  type Match,
  type TournamentState,
} from './swiss';

// Deterministic PRNG (mulberry32).
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makeItems = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}`, name: `Item ${i}` }));

const key = (m: Match) => [m.a, m.b].sort().join('|');

/** Play the current round, the lower id always winning (a fixed "true" ranking). */
function playRound(state: TournamentState, rng: () => number): TournamentState {
  const round = state.round;
  let s = state;
  while (!s.complete && s.round === round && s.pending.length > 0) {
    const m = s.pending[0];
    const winner = Number(m.a.slice(1)) < Number(m.b!.slice(1)) ? m.a : m.b!;
    s = recordResult(s, winner, rng);
  }
  return s;
}

describe('createTournament', () => {
  it('pairs everyone in round 1 with an even count', () => {
    const s = createTournament(makeItems(6), seeded(1));
    expect(s.round).toBe(1);
    expect(s.pending).toHaveLength(3);
    const ids = s.pending.flatMap((m) => [m.a, m.b]);
    expect(new Set(ids).size).toBe(6);
    expect(s.matches).toHaveLength(0);
  });

  it('gives exactly one bye with an odd count', () => {
    const s = createTournament(makeItems(7), seeded(2));
    expect(s.pending).toHaveLength(3);
    expect(s.matches).toHaveLength(1);
    expect(s.matches[0].b).toBeNull();
    expect(s.matches[0].winner).toBe(s.matches[0].a);
  });

  it('is complete immediately with fewer than two items', () => {
    expect(createTournament(makeItems(1)).complete).toBe(true);
  });
});

describe('playing rounds', () => {
  it('never repeats a pairing and stops once every pair has met', () => {
    for (const n of [2, 3, 5, 6, 8, 9]) {
      const rng = seeded(n);
      let s = createTournament(makeItems(n), rng);
      let guard = 0;
      while (!s.complete && guard++ < 100) s = playRound(s, rng);
      expect(s.complete).toBe(true);
      const real = s.matches.filter((m) => m.b !== null);
      const keys = real.map(key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBe(totalPairs(n));
    }
  });

  it('gives each item at most one bye while byes remain avoidable', () => {
    const rng = seeded(42);
    let s = createTournament(makeItems(7), rng);
    for (let r = 0; r < 6 && !s.complete; r++) s = playRound(s, rng);
    const byes = s.matches.filter((m) => m.b === null).map((m) => m.a);
    expect(new Set(byes).size).toBe(byes.length);
  });

  it('gives the bye to the lowest-ranked item without a previous bye', () => {
    const rng = seeded(3);
    let s = createTournament(makeItems(5), rng);
    s = playRound(s, rng);
    const before = computeStandings(s.items, s.matches.filter((m) => m.round < s.round));
    const bye = s.matches.find((m) => m.b === null && m.round === s.round)!;
    const firstBye = s.matches.find((m) => m.b === null && m.round === 1)!;
    const expected = [...before].reverse().find((r) => r.item.id !== firstBye.a)!;
    expect(bye.a).toBe(expected.item.id);
  });

  it('ranks the "true" order first after enough rounds', () => {
    const rng = seeded(7);
    let s = createTournament(makeItems(8), rng);
    for (let r = 0; r < recommendedRounds(8); r++) s = playRound(s, rng);
    const top = computeStandings(s.items, s.matches)[0];
    expect(top.item.id).toBe('i0');
    expect(top.score).toBe(3);
  });

  it('ignores a winner that is not in the current match', () => {
    const s = createTournament(makeItems(4), seeded(5));
    const outsider = s.items.find((i) => i.id !== s.pending[0].a && i.id !== s.pending[0].b)!;
    expect(recordResult(s, outsider.id)).toBe(s);
  });
});

describe('computeStandings', () => {
  const items = makeItems(4);
  const matches: Match[] = [
    { a: 'i0', b: 'i1', winner: 'i0', round: 1 },
    { a: 'i2', b: 'i3', winner: 'i2', round: 1 },
    { a: 'i0', b: 'i2', winner: 'i0', round: 2 },
    { a: 'i1', b: 'i3', winner: 'i1', round: 2 },
  ];

  it('computes score, W-L and Buchholz', () => {
    const rows = Object.fromEntries(computeStandings(items, matches).map((r) => [r.item.id, r]));
    expect(rows.i0).toMatchObject({ score: 2, wins: 2, losses: 0, buchholz: 2 });
    expect(rows.i1).toMatchObject({ score: 1, wins: 1, losses: 1, buchholz: 2 });
    expect(rows.i2).toMatchObject({ score: 1, wins: 1, losses: 1, buchholz: 2 });
    expect(rows.i3).toMatchObject({ score: 0, wins: 0, losses: 2, buchholz: 2 });
  });

  it('breaks ties by head-to-head, then name', () => {
    const order = computeStandings(items, matches).map((r) => r.item.id);
    expect(order).toEqual(['i0', 'i1', 'i2', 'i3']);
    const flipped = computeStandings(items, [...matches, { a: 'i1', b: 'i2', winner: 'i2', round: 3 }]);
    // i2 now has 2 points, i1 stays on 1.
    expect(flipped.map((r) => r.item.id).slice(0, 2)).toEqual(['i0', 'i2']);
  });

  it('counts a bye as a point but not toward Buchholz', () => {
    const rows = computeStandings(items.slice(0, 1), [{ a: 'i0', b: null, winner: 'i0', round: 1 }]);
    expect(rows[0]).toMatchObject({ score: 1, byes: 1, buchholz: 0, wins: 0 });
  });
});
