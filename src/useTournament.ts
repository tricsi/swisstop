import { useEffect, useReducer } from 'react';
import { createTournament, recordResult, type Item, type TournamentState } from './swiss';
import { newId, type ImportedData } from './transfer';

export type Step = 'setup' | 'duel' | 'results';

export type AppState = {
  step: Step;
  items: Item[];
  tournament: TournamentState | null;
  /** Previous tournament states, newest last, for undo. */
  history: TournamentState[];
};

export type Action =
  | { type: 'addItem'; name: string }
  | { type: 'addItems'; names: string[] }
  | { type: 'removeItem'; id: string }
  | { type: 'start' }
  | { type: 'pick'; winnerId: string }
  | { type: 'undo' }
  | { type: 'goTo'; step: Step }
  | { type: 'reset' }
  | { type: 'clearResults' }
  | { type: 'load'; data: ImportedData };

const STORAGE_KEY = 'swiss-toplist-v1';
const MAX_HISTORY = 500;

const initialState: AppState = { step: 'setup', items: [], tournament: null, history: [] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'addItem': {
      const name = action.name.trim();
      if (!name || state.items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return state;
      // Changing the list invalidates any tournament in progress.
      return { ...state, items: [...state.items, { id: newId(), name }], tournament: null, history: [] };
    }
    case 'addItems': {
      // Bulk add: skip blanks and names already on the list (or repeated in the batch).
      const seen = new Set(state.items.map((i) => i.name.toLowerCase()));
      const added: Item[] = [];
      for (const raw of action.names) {
        const name = raw.trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());
        added.push({ id: newId(), name });
      }
      if (added.length === 0) return state;
      return { ...state, items: [...state.items, ...added], tournament: null, history: [] };
    }
    case 'removeItem':
      return { ...state, items: state.items.filter((i) => i.id !== action.id), tournament: null, history: [] };
    case 'start':
      if (state.items.length < 2) return state;
      return { ...state, step: 'duel', tournament: createTournament(state.items), history: [] };
    case 'pick': {
      if (!state.tournament) return state;
      const next = recordResult(state.tournament, action.winnerId);
      if (next === state.tournament) return state;
      return { ...state, tournament: next, history: [...state.history, state.tournament].slice(-MAX_HISTORY) };
    }
    case 'undo': {
      const prev = state.history[state.history.length - 1];
      if (!prev) return state;
      return { ...state, tournament: prev, history: state.history.slice(0, -1) };
    }
    case 'goTo':
      if (action.step !== 'setup' && !state.tournament) return state;
      return { ...state, step: action.step };
    case 'reset':
      return initialState;
    case 'clearResults':
      // Keep the items, drop all comparisons, back to the first step.
      return { ...initialState, items: state.items };
    case 'load':
      return { ...action.data, history: [] };
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as AppState;
    if (!Array.isArray(parsed.items)) return initialState;
    return { ...initialState, ...parsed, step: parsed.tournament ? parsed.step : 'setup' };
  } catch {
    return initialState;
  }
}

export function useTournament() {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode, quota): keep working in memory.
    }
  }, [state]);

  return [state, dispatch] as const;
}
