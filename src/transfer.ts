// JSON export / import of the app's data.
import type { Item, Match, TournamentState } from './swiss';
import type { AppState, Step } from './useTournament';

export const FORMAT = 'swiss-toplist';
export const VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ExportFile = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  step: Step;
  items: Item[];
  tournament: TournamentState | null;
};

export type ImportedData = { step: Step; items: Item[]; tournament: TournamentState | null };

export type ImportError = 'invalidJson' | 'invalidFormat' | 'unsupportedVersion';

export type ImportResult = { ok: true; data: ImportedData } | { ok: false; error: ImportError };

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function toExportFile(state: AppState, now = new Date()): ExportFile {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: now.toISOString(),
    step: state.step,
    items: state.items,
    tournament: state.tournament,
  };
}

export const exportFileName = (now = new Date()) => `toplist-${now.toISOString().slice(0, 10)}.json`;

// --- Validation -------------------------------------------------------------

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const isRound = (v: unknown, min: number): v is number => Number.isInteger(v) && (v as number) >= min;
const STEPS: Step[] = ['setup', 'duel', 'results'];

function parseItems(value: unknown): Item[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const names = new Set<string>();
  const items: Item[] = [];
  for (const v of value) {
    if (!isObject(v) || !isNonEmptyString(v.id) || !isNonEmptyString(v.name)) return null;
    const name = v.name.trim();
    if (ids.has(v.id) || names.has(name.toLowerCase())) return null;
    ids.add(v.id);
    names.add(name.toLowerCase());
    items.push({ id: v.id, name });
  }
  return items;
}

function parseMatch(value: unknown, ids: Set<string>, decided: boolean): Match | null {
  if (!isObject(value)) return null;
  const { a, b, winner, round } = value;
  if (typeof a !== 'string' || !ids.has(a) || !isRound(round, 1)) return null;
  if (b !== null && (typeof b !== 'string' || !ids.has(b) || b === a)) return null;
  if (decided) {
    if (winner !== a && winner !== b) return null;
    if (b === null && winner !== a) return null;
  } else if (winner !== null || b === null) {
    return null;
  }
  return { a, b: b as string | null, winner: winner as string | null, round };
}

function parseMatches(value: unknown, ids: Set<string>, decided: boolean): Match[] | null {
  if (!Array.isArray(value)) return null;
  const out: Match[] = [];
  for (const v of value) {
    const m = parseMatch(v, ids, decided);
    if (!m) return null;
    out.push(m);
  }
  return out;
}

function parseTournament(value: unknown, items: Item[]): TournamentState | null | undefined {
  if (value === null || value === undefined) return null;
  if (!isObject(value)) return undefined;
  const tItems = parseItems(value.items);
  if (!tItems || tItems.length !== items.length) return undefined;
  const ids = new Set(items.map((i) => i.id));
  if (!tItems.every((i) => ids.has(i.id))) return undefined;
  const matches = parseMatches(value.matches, ids, true);
  const pending = parseMatches(value.pending, ids, false);
  if (!matches || !pending || !isRound(value.round, 0) || typeof value.complete !== 'boolean') return undefined;
  return { items: tItems, matches, pending, round: value.round, complete: value.complete };
}

/** Plain list of names, e.g. ["Pizza", "Sushi"]: duplicates and blanks are skipped. */
function parseNameList(value: unknown[]): ImportResult {
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const v of value) {
    if (typeof v !== 'string') return { ok: false, error: 'invalidFormat' };
    const name = v.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    items.push({ id: newId(), name });
  }
  if (items.length === 0) return { ok: false, error: 'invalidFormat' };
  return { ok: true, data: { step: 'setup', items, tournament: null } };
}

/** Accepts a full export file or a plain JSON array of item names. */
export function parseImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'invalidJson' };
  }

  if (Array.isArray(json)) return parseNameList(json);
  if (!isObject(json) || json.format !== FORMAT) return { ok: false, error: 'invalidFormat' };
  if (!isRound(json.version, 1)) return { ok: false, error: 'invalidFormat' };
  if (json.version > VERSION) return { ok: false, error: 'unsupportedVersion' };

  const items = parseItems(json.items);
  if (!items) return { ok: false, error: 'invalidFormat' };
  const tournament = parseTournament(json.tournament, items);
  if (tournament === undefined) return { ok: false, error: 'invalidFormat' };

  const step = STEPS.includes(json.step as Step) && tournament ? (json.step as Step) : 'setup';
  return { ok: true, data: { step, items, tournament } };
}
