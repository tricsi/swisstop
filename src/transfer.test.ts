import { describe, expect, it } from 'vitest';
import { createTournament, recordResult } from './swiss';
import { FORMAT, VERSION, parseImport, toExportFile } from './transfer';
import type { AppState } from './useTournament';

const items = [
  { id: 'a', name: 'Pizza' },
  { id: 'b', name: 'Sushi' },
  { id: 'c', name: 'Tacos' },
];

function playedState(): AppState {
  let t = createTournament(items, () => 0.3);
  t = recordResult(t, t.pending[0].a);
  return { step: 'results', items, tournament: t, history: [] };
}

describe('export / import round trip', () => {
  it('restores items, tournament and step', () => {
    const state = playedState();
    const text = JSON.stringify(toExportFile(state));
    const result = parseImport(text);
    expect(result).toEqual({ ok: true, data: { step: 'results', items, tournament: state.tournament } });
  });

  it('works for a list without a tournament (falls back to the setup step)', () => {
    const state: AppState = { step: 'duel', items, tournament: null, history: [] };
    const result = parseImport(JSON.stringify(toExportFile(state)));
    expect(result).toEqual({ ok: true, data: { step: 'setup', items, tournament: null } });
  });

  it('does not include undo history', () => {
    const file = toExportFile({ ...playedState(), history: [playedState().tournament!] });
    expect(file).not.toHaveProperty('history');
    expect(file).toMatchObject({ format: FORMAT, version: VERSION });
  });
});

describe('plain name list', () => {
  it('accepts an array of names, skipping blanks and duplicates', () => {
    const result = parseImport(JSON.stringify(['Pizza', '  Sushi ', '', 'pizza']));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.map((i) => i.name)).toEqual(['Pizza', 'Sushi']);
      expect(result.data.tournament).toBeNull();
    }
  });

  it('rejects an empty or non-string list', () => {
    expect(parseImport('[]')).toEqual({ ok: false, error: 'invalidFormat' });
    expect(parseImport('[1, 2]')).toEqual({ ok: false, error: 'invalidFormat' });
  });
});

describe('invalid files', () => {
  const base = () => JSON.parse(JSON.stringify(toExportFile(playedState())));

  it('rejects broken JSON', () => {
    expect(parseImport('{nope')).toEqual({ ok: false, error: 'invalidJson' });
  });

  it('rejects other JSON documents', () => {
    expect(parseImport('{"hello": 1}')).toEqual({ ok: false, error: 'invalidFormat' });
  });

  it('rejects files from a newer version', () => {
    expect(parseImport(JSON.stringify({ ...base(), version: VERSION + 1 }))).toEqual({
      ok: false,
      error: 'unsupportedVersion',
    });
  });

  it('rejects duplicate item ids or names', () => {
    const f = base();
    f.items.push({ id: 'a', name: 'Other' });
    expect(parseImport(JSON.stringify(f)).ok).toBe(false);
    const g = base();
    g.items.push({ id: 'z', name: 'PIZZA' });
    expect(parseImport(JSON.stringify(g)).ok).toBe(false);
  });

  it('rejects matches that refer to unknown items or impossible winners', () => {
    const f = base();
    f.tournament.matches[f.tournament.matches.length - 1].winner = 'x';
    expect(parseImport(JSON.stringify(f)).ok).toBe(false);
    const g = base();
    g.tournament.pending[0] = { a: 'a', b: 'nobody', winner: null, round: 1 };
    expect(parseImport(JSON.stringify(g)).ok).toBe(false);
  });

  it('rejects a tournament whose items differ from the list', () => {
    const f = base();
    f.items = f.items.slice(0, 2);
    expect(parseImport(JSON.stringify(f)).ok).toBe(false);
  });
});
