import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nContext, LANG_STORAGE_KEY, detectLang } from './context';
import { MESSAGES, type Lang } from './messages';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);
  const value = useMemo(() => ({ lang, t: MESSAGES[lang], setLang }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = MESSAGES[lang].appTitle;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Storage unavailable: keep the choice for this session only.
    }
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
