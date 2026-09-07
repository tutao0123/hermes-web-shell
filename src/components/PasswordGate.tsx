import { useState, type FormEvent } from 'react'
import { AUTH_STORAGE_KEY, DEFAULT_PASSWORD } from '../constants'
import { useUiPrefs } from '../prefs/UiPrefs'
import { PrefsToggles } from './PrefsToggles'

interface Props {
  onUnlock: () => void
}

export function PasswordGate({ onUnlock }: Props) {
  const { t } = useUiPrefs()
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password === DEFAULT_PASSWORD) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, '1')
      setHasError(false)
      onUnlock()
      return
    }
    setHasError(true)
  }

  return (
    <div className="gate">
      <PrefsToggles className="gate-prefs" />
      <div className="gate-card">
        <div className="gate-icon" aria-hidden>
          ✦
        </div>
        <h1>Hermes Agent</h1>
        <p className="muted">{t('gate.subtitle')}</p>
        <form onSubmit={handleSubmit} className="gate-form">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (hasError) setHasError(false)
            }}
            placeholder={t('gate.passwordPlaceholder')}
            autoFocus
            autoComplete="current-password"
          />
          {hasError ? <p className="error">{t('gate.wrongPassword')}</p> : null}
          <button type="submit" className="btn-primary">
            {t('gate.enter')}
          </button>
        </form>
      </div>
    </div>
  )
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === '1'
}
