import { useEffect, useMemo, useState } from 'react'
import { hermesAdapter } from './adapter/HermesAdapter'
import { isAuthenticated, PasswordGate } from './components/PasswordGate'
import { ChatPage } from './pages/ChatPage'
import { TasksPage } from './pages/TasksPage'
import { WorkspacesPage } from './pages/WorkspacesPage'
import { useUiPrefs } from './prefs/UiPrefs'
import type { AppView, Task, Workspace } from './types'
import './App.css'

function App() {
  const { t } = useUiPrefs()
  const [authed, setAuthed] = useState(() => isAuthenticated())
  const [view, setView] = useState<AppView>({ name: 'workspaces' })
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [ready, setReady] = useState(false)
  const [modelName, setModelName] = useState('…')

  useEffect(() => {
    if (!authed) return
    let cancelled = false
    Promise.all([
      hermesAdapter.listWorkspaces(),
      hermesAdapter.listTasks(),
      hermesAdapter.getStatus(),
    ]).then(([ws, ts, status]) => {
      if (!cancelled) {
        setWorkspaces(ws)
        setTasks(ts)
        setModelName(status.model || 'hermes')
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [authed])

  const currentWorkspace = useMemo(() => {
    if (view.name === 'workspaces') return undefined
    return workspaces.find((w) => w.id === view.workspaceId)
  }, [view, workspaces])

  const currentTask = useMemo(() => {
    if (view.name !== 'chat') return undefined
    return tasks.find((t) => t.id === view.taskId)
  }, [view, tasks])

  const workspaceTasks = useMemo(() => {
    if (!currentWorkspace) return []
    return tasks.filter((t) => t.workspaceId === currentWorkspace.id)
  }, [currentWorkspace, tasks])

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />
  }

  if (!ready) {
    return (
      <div className="gate">
        <p className="muted">{t('loading.connecting')}</p>
      </div>
    )
  }

  if (view.name === 'chat' && currentWorkspace && currentTask) {
    return (
      <ChatPage
        workspace={currentWorkspace}
        task={currentTask}
        modelName={modelName}
        onBack={() => setView({ name: 'tasks', workspaceId: currentWorkspace.id })}
      />
    )
  }

  if (view.name === 'tasks' && currentWorkspace) {
    return (
      <TasksPage
        workspace={currentWorkspace}
        tasks={workspaceTasks}
        onBack={() => setView({ name: 'workspaces' })}
        onOpenTask={(taskId) =>
          setView({
            name: 'chat',
            workspaceId: currentWorkspace.id,
            taskId,
          })
        }
      />
    )
  }

  return (
    <WorkspacesPage
      workspaces={workspaces}
      tasks={tasks}
      onOpenWorkspace={(workspaceId) => setView({ name: 'tasks', workspaceId })}
      onOpenTask={(workspaceId, taskId) =>
        setView({ name: 'chat', workspaceId, taskId })
      }
    />
  )
}

export default App
