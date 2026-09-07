import { useUiPrefs } from '../prefs/UiPrefs'

interface Props {
  open: boolean
  onReturn: () => void
}

const desktopUrl = (import.meta.env.VITE_DESKTOP_URL as string | undefined)?.trim()

export function DesktopOverlay({ open, onReturn }: Props) {
  const { t } = useUiPrefs()

  if (!open) return null

  const usingExternal = Boolean(desktopUrl)

  return (
    <div className="desktop-overlay" role="dialog" aria-modal="true">
      <div className="desktop-bar">
        <span>{usingExternal ? t('desktop.remote') : t('desktop.mockTitle')}</span>
        <button type="button" className="btn-return" onClick={onReturn}>
          {t('desktop.return')}
        </button>
      </div>
      {usingExternal ? (
        <iframe
          className="desktop-iframe"
          src={desktopUrl}
          title={t('desktop.iframeTitle')}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      ) : (
        <div className="desktop-screen">
          <div className="fake-window">
            <div className="fake-titlebar">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
              <span className="fake-title">{t('desktop.fakeWindowTitle')}</span>
            </div>
            <div className="fake-body">
              <h2>{t('desktop.loginHeading')}</h2>
              <p className="muted">{t('desktop.mockHint')}</p>
              <div className="fake-form">
                <input disabled placeholder={t('desktop.accountPlaceholder')} />
                <input
                  disabled
                  type="password"
                  placeholder={t('desktop.passwordPlaceholder')}
                />
                <button type="button" className="btn-primary" disabled>
                  {t('desktop.loginDemo')}
                </button>
              </div>
              <p className="hint">{t('desktop.returnHint')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
