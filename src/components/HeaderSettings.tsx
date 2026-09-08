import { useEffect, useId, useRef, useState } from 'react'
import { useUiPrefs } from '../prefs/UiPrefs'
import { PrefsToggles } from './PrefsToggles'

export function HeaderSettings() {
  const { t } = useUiPrefs()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return (
    <div className="header-settings" ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <button ref={trigger} type="button" className="settings-trigger icon-btn"
        aria-label={t('prefs.settings')} aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((value) => !value)}>⋯</button>
      {open ? <div id={id} className="settings-panel" role="group" aria-label={t('prefs.settings')}>
        <PrefsToggles />
        <a href="/connect" className="settings-connect">{t('prefs.connectPhone')}</a>
      </div> : null}
    </div>
  )
}
