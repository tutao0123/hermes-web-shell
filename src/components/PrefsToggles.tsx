import { useUiPrefs } from '../prefs/UiPrefs'

export function PrefsToggles({ className = '' }: { className?: string }) {
  const { theme, locale, setTheme, setLocale, t } = useUiPrefs()

  return (
    <div
      className={`prefs-toggles ${className}`.trim()}
      role="group"
      aria-label="Preferences"
    >
      <div className="prefs-segment" role="group" aria-label={t('prefs.localeLabel')}>
        <button
          type="button"
          className={`prefs-seg-btn ${locale === 'zh' ? 'active' : ''}`}
          onClick={() => setLocale('zh')}
          aria-pressed={locale === 'zh'}
        >
          {t('prefs.localeZh')}
        </button>
        <span className="prefs-sep" aria-hidden>
          |
        </span>
        <button
          type="button"
          className={`prefs-seg-btn ${locale === 'en' ? 'active' : ''}`}
          onClick={() => setLocale('en')}
          aria-pressed={locale === 'en'}
        >
          {t('prefs.localeEn')}
        </button>
      </div>
      <div className="prefs-segment" role="group" aria-label={t('prefs.themeLabel')}>
        <button
          type="button"
          className={`prefs-seg-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          aria-pressed={theme === 'light'}
          title={t('prefs.themeLight')}
        >
          ☀ {t('prefs.themeLight')}
        </button>
        <span className="prefs-sep" aria-hidden>
          |
        </span>
        <button
          type="button"
          className={`prefs-seg-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-pressed={theme === 'dark'}
          title={t('prefs.themeDark')}
        >
          ☾ {t('prefs.themeDark')}
        </button>
      </div>
    </div>
  )
}
