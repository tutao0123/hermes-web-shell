import { PrefsToggles } from '../components/PrefsToggles'
import { StatusPill } from '../components/StatusPill'
import { useUiPrefs } from '../prefs/UiPrefs'
import type { Task, Workspace } from '../types'

interface Props {
  workspace: Workspace
  tasks: Task[]
  onBack: () => void
  onOpenTask: (taskId: string) => void
}

export function TasksPage({ workspace, tasks, onBack, onOpenTask }: Props) {
  const { t } = useUiPrefs()

  return (
    <div className="page">
      <header className="app-header compact">
        <div className="header-top">
          <div className="header-row">
            <button type="button" className="icon-btn back" onClick={onBack}>
              ‹
            </button>
            <div>
              <h1>{workspace.name}</h1>
              <p className="subtitle path">{workspace.path}</p>
            </div>
          </div>
          <PrefsToggles />
        </div>
      </header>

      <section className="section">
        <div className="section-head">
          <h2>{t('tasks.listTitle')}</h2>
          <p className="meta">{t('tasks.meta', { count: tasks.length })}</p>
        </div>
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="task-row"
                onClick={() => onOpenTask(task.id)}
              >
                <span className="task-preview-text">
                  <span className="task-title">{task.title}</span>
                  <span className="muted small">
                    {t('tasks.updatedAt', { time: task.updatedAt })}
                  </span>
                </span>
                <StatusPill status={task.status} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
