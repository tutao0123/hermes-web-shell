import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { LOCALE_STORAGE_KEY, THEME_STORAGE_KEY } from '../constants'
import {
  formatMessage,
  messages,
  type Locale,
  type MessageKey,
} from '../i18n/messages'

export type Theme = 'light' | 'dark'

function detectDefaultTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }
  return 'light'
}

function detectDefaultLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return 'zh'
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

interface UiPrefsValue {
  theme: Theme
  locale: Locale
  setTheme: (theme: Theme) => void
  setLocale: (locale: Locale) => void
  toggleTheme: () => void
  toggleLocale: () => void
  t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const UiPrefsContext = createContext<UiPrefsValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => detectDefaultTheme())
  const [locale, setLocaleState] = useState<Locale>(() => detectDefaultLocale())

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
  }, [locale])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const setLocale = useCallback((next: Locale) => setLocaleState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState((t) => (t === 'light' ? 'dark' : 'light')),
    [],
  )
  const toggleLocale = useCallback(
    () => setLocaleState((l) => (l === 'zh' ? 'en' : 'zh')),
    [],
  )

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      formatMessage(messages[locale][key] ?? messages.zh[key] ?? key, vars),
    [locale],
  )

  const value = useMemo(
    () => ({
      theme,
      locale,
      setTheme,
      setLocale,
      toggleTheme,
      toggleLocale,
      t,
    }),
    [theme, locale, setTheme, setLocale, toggleTheme, toggleLocale, t],
  )

  return (
    <UiPrefsContext.Provider value={value}>{children}</UiPrefsContext.Provider>
  )
}

export function useUiPrefs(): UiPrefsValue {
  const ctx = useContext(UiPrefsContext)
  if (!ctx) throw new Error('useUiPrefs must be used within PrefsProvider')
  return ctx
}
