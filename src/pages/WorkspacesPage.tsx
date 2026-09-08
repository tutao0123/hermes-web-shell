import { useMemo, useState } from 'react'
import { HeaderSettings } from '../components/HeaderSettings'
import { StatusPill } from '../components/StatusPill'
import { useUiPrefs } from '../prefs/UiPrefs'
import type { Task, Workspace } from '../types'

interface Props {
  workspaces: Workspace[]
  tasks: Task[]
  onOpenWorkspace: (workspaceId: string) => void
  onOpenTask: (workspaceId: string, taskId: string) => void
}

export function WorkspacesPage({
  workspaces,
  tasks,
  onOpenWorkspace,
  onOpenTask,
}: Props) {
  const { t } = useUiPrefs()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const tasksByWs = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const task of tasks) {
      ;(map[task.workspaceId] ??= []).push(task)
    }
    return map
  }, [tasks])

  const totalTasks = tasks.length

  const effectiveExpanded = useMemo(() => {
    if (Object.keys(expanded).length > 0) return expanded
    if (workspaces[0]) return { [workspaces[0].id]: true }
    return expanded
  }, [expanded, workspaces])

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="header-top">
          <div>
            <div className="header-row">
              <span className="spark" aria-hidden>
                ✦
              </span>
              <h1>Hermes Agent</h1>
            </div>
            <p className="subtitle">{t('workspaces.subtitle')}</p>
          </div>
          <HeaderSettings />
        </div>
      </header>

      <div className="info-banner">{t('workspaces.banner')}</div>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>{t('workspaces.sectionTitle')}</h2>
            <p className="meta">
              {t('workspaces.meta', {
                workspaces: workspaces.length,
                tasks: totalTasks,
              })}
            </p>
          </div>
          <div className="section-actions" aria-hidden>
            <button type="button" className="icon-btn" title={t('workspaces.collapse')}>
              ⌃
            </button>
            <button type="button" className="icon-btn" title={t('workspaces.refresh')}>
              ↻
            </button>
          </div>
        </div>

        <div className="card-list">
          {workspaces.map((ws) => {
            const wsTasks = tasksByWs[ws.id] ?? []
            const isOpen = !!effectiveExpanded[ws.id]
            const hasRunning = wsTasks.some((task) => task.status === 'running')
            return (
              <article key={ws.id} className="ws-card">
                <div className="ws-card-main">
                  <button
                    type="button"
                    className="ws-card-body"
                    onClick={() => toggle(ws.id)}
                  >
                    <span className="ws-icon" aria-hidden>
                      {ws.kind === 'remote' ? '☁' : '📁'}
                    </span>
                    <span className="ws-info">
                      <span className="ws-title-row">
                        <strong>{ws.name}</strong>
                        <span
                          className={`badge ${ws.kind === 'remote' ? 'badge-remote' : ''}`}
                        >
                          {ws.kind === 'remote'
                            ? t('workspaces.remote')
                            : t('workspaces.local')}
                        </span>
                      </span>
                      <span className="path">{ws.path}</span>
                      <span className="muted small">
                        {t('workspaces.updatedAt', { time: ws.updatedAt })}
                      </span>
                    </span>
                    <span className="ws-side">
                      <span className="task-count">
                        {hasRunning ? <span className="dot-live" /> : null}
                        {t('workspaces.taskCount', { count: wsTasks.length })}
                      </span>
                      <span className="chevron">{isOpen ? '▾' : '›'}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="plus-btn"
                    title={t('workspaces.openWorkspace')}
                    onClick={() => onOpenWorkspace(ws.id)}
                  >
                    +
                  </button>
                </div>

                {isOpen && wsTasks.length > 0 ? (
                  <ul className="task-preview">
                    {wsTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          type="button"
                          className="task-preview-item"
                          onClick={() => onOpenTask(ws.id, task.id)}
                        >
                          <span className="task-preview-text">
                            <span className="task-title">{task.title}</span>
                            <span className="muted small">{task.updatedAt}</span>
                          </span>
                          <StatusPill status={task.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
