import { useUiPrefs, type Theme } from '../prefs/UiPrefs'

interface ThemeOption {
  id: Theme
  labelKey:
    | 'prefs.themeHermes'
    | 'prefs.themeMono'
    | 'prefs.themeSlate'
    | 'prefs.themeAres'
    | 'prefs.themeLight'
  dot: string
  border?: string
}

const THEMES: ThemeOption[] = [
  { id: 'hermes', labelKey: 'prefs.themeHermes', dot: '#f5c542' },
  { id: 'mono', labelKey: 'prefs.themeMono', dot: '#ffffff' },
  { id: 'slate', labelKey: 'prefs.themeSlate', dot: '#38bdf8' },
  { id: 'ares', labelKey: 'prefs.themeAres', dot: '#ef4444' },
  { id: 'light', labelKey: 'prefs.themeLight', dot: '#e2e8f0', border: '#94a3b8' },
]

export function PrefsToggles({ className = '' }: { className?: string }) {
  const { theme, locale, setTheme, setLocale, t } = useUiPrefs()

  return (
    <div
      className={`prefs-toggles ${className}`.trim()}
      role="group"
      aria-label="Preferences"
    >
      <div className="prefs-section">
        <span className="prefs-section-title">{t('prefs.themeLabel')}</span>
        <div className="prefs-theme-grid" role="group" aria-label={t('prefs.themeLabel')}>
          {THEMES.map((item) => {
            const active = theme === item.id || ((theme as string) === 'dark' && item.id === 'hermes')
            return (
              <button
                key={item.id}
                type="button"
                className={`theme-chip ${active ? 'active' : ''}`}
                onClick={() => setTheme(item.id)}
                aria-pressed={active}
              >
                <span
                  className="theme-dot"
                  style={{
                    backgroundColor: item.dot,
                    borderColor: item.border || item.dot,
                  }}
                  aria-hidden
                />
                <span className="theme-name">{t(item.labelKey)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="prefs-section">
        <span className="prefs-section-title">{t('prefs.localeLabel')}</span>
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
      </div>
    </div>
  )
}
