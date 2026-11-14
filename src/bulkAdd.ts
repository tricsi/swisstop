// Parsing of the "Import list" textbox: one item name per line.
import type { Item } from './swiss';

/** Same limit as the single-item input. */
export const MAX_NAME_LENGTH = 80;
export const MAX_LINES = 500;

export type BulkParseResult = {
  /** Trimmed, de-duplicated names that can be added, in input order. */
  names: string[];
  /** Lines (trimmed) longer than MAX_NAME_LENGTH. Their presence blocks the import. */
  tooLong: string[];
  /** Names skipped because they are already on the list or repeated in the input. */
  duplicates: string[];
  /** More non-empty lines than MAX_LINES. Blocks the import. */
  tooMany: boolean;
};

export function parseItemLines(text: string, existing: Item[]): BulkParseResult {
  const seen = new Set(existing.map((i) => i.name.toLowerCase()));
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const names: string[] = [];
  const tooLong: string[] = [];
  const duplicates: string[] = [];
  for (const line of lines) {
    if (line.length > MAX_NAME_LENGTH) {
      tooLong.push(line);
      continue;
    }
    const key = line.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(line);
      continue;
    }
    seen.add(key);
    names.push(line);
  }
  return { names, tooLong, duplicates, tooMany: lines.length > MAX_LINES };
}

export const canImport = (r: BulkParseResult) => r.names.length > 0 && r.tooLong.length === 0 && !r.tooMany;
