import { describe, expect, it } from 'vitest';
import { MAX_LINES, MAX_NAME_LENGTH, canImport, parseItemLines } from './bulkAdd';

const existing = [{ id: 'a', name: 'Pizza' }];

describe('parseItemLines', () => {
  it('trims lines and drops empty ones', () => {
    const r = parseItemLines('  Sushi \n\n   \r\nTacos\n\t\n', []);
    expect(r.names).toEqual(['Sushi', 'Tacos']);
    expect(canImport(r)).toBe(true);
  });

  it('skips names already on the list or repeated, case-insensitively', () => {
    const r = parseItemLines('pizza\nSushi\nSUSHI\nTacos', existing);
    expect(r.names).toEqual(['Sushi', 'Tacos']);
    expect(r.duplicates).toEqual(['pizza', 'SUSHI']);
    expect(canImport(r)).toBe(true);
  });

  it('rejects names over the length limit', () => {
    const long = 'x'.repeat(MAX_NAME_LENGTH + 1);
    const r = parseItemLines(`Sushi\n${long}`, []);
    expect(r.tooLong).toEqual([long]);
    expect(canImport(r)).toBe(false);
  });

  it('cannot import empty or all-duplicate input', () => {
    expect(canImport(parseItemLines('  \n\n', []))).toBe(false);
    expect(canImport(parseItemLines('Pizza\npizza', existing))).toBe(false);
  });

  it('rejects too many lines', () => {
    const text = Array.from({ length: MAX_LINES + 1 }, (_, i) => `Item ${i}`).join('\n');
    const r = parseItemLines(text, []);
    expect(r.tooMany).toBe(true);
    expect(canImport(r)).toBe(false);
  });
});
