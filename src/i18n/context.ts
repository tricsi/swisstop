import { createContext, useContext } from 'react';
import { LANGS, MESSAGES, type Lang, type Messages } from './messages';

export type I18n = { lang: Lang; t: Messages; setLang: (lang: Lang) => void };

export const I18nContext = createContext<I18n>({ lang: 'en', t: MESSAGES.en, setLang: () => {} });

export const useI18n = () => useContext(I18nContext);

export const LANG_STORAGE_KEY = 'swiss-toplist-lang';

const isLang = (value: unknown): value is Lang => LANGS.includes(value as Lang);

/** Saved choice first, then the browser's preferred languages, then English. */
export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Storage unavailable.
  }
  const preferred = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : [];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}
