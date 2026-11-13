import { useI18n } from '../i18n/context';
import { LANGS, LANG_NAMES } from '../i18n/messages';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          title={LANG_NAMES[code]}
          aria-pressed={code === lang}
          className={code === lang ? 'active' : undefined}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
