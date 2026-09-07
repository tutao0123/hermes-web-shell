import { useUiPrefs } from '../prefs/UiPrefs'
import type { TaskStatus } from '../types'

export function StatusPill({ status }: { status: TaskStatus }) {
  const { t } = useUiPrefs()

  if (status === 'running') {
    return (
      <span className="pill pill-running">
        <span className="spinner" aria-hidden />
        {t('status.running')}
      </span>
    )
  }
  if (status === 'completed') {
    return (
      <span className="pill pill-done">
        <span aria-hidden>✓</span>
        {t('status.completed')}
      </span>
    )
  }
  return <span className="pill">{t('status.pending')}</span>
}
