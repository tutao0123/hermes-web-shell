import type { ChatBlock, ChatSession, Task, TaskStatus, Workspace } from '../types'
import { LOCALE_STORAGE_KEY } from '../constants'
import type { Locale } from '../i18n/messages'
import { mockHermesAdapter as mockAdapter } from './MockHermesAdapter'

export interface HermesStatus {
  version: string
  model: string
  modelFull?: string
  gateway?: {
    running?: boolean
    state?: unknown
    overall?: unknown
  }
}

interface ApiSession {
  id: string
  title: string
  cwd: string
  model: string | null
  message_count: number
  updatedAt: string
  updatedAtTs?: number
  status: TaskStatus
}

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (v === 'en' || v === 'zh') return v
  } catch {
    /* ignore */
  }
  return 'zh'
}

function sessionsUrl(): string {
  const locale = readLocale()
  return `/api/hermes/sessions?locale=${locale}`
}

function workspaceIdFromCwd(cwd: string): string {
  return `ws-${btoa(unescape(encodeURIComponent(cwd)))
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`
}

function workspaceName(cwd: string, locale: Locale): string {
  const parts = cwd.replace(/\\/g, '/').replace(/\/+$/, '').split('/').filter(Boolean)
  const leaf = parts[parts.length - 1] || cwd
  if (leaf) return leaf
  return locale === 'en' ? 'Local Hermes' : 'Local Hermes ZH'
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `request failed (${res.status})`)
  }
  return data
}

export class HermesAdapter {
  private statusCache: HermesStatus | null = null
  private useMock = false

  async getStatus(force = false): Promise<HermesStatus> {
    if (this.statusCache && !force) return this.statusCache
    try {
      const s = await fetchJson<HermesStatus>('/api/hermes/status')
      this.statusCache = s
      this.useMock = false
      return s
    } catch {
      this.useMock = true
      return { version: 'mock', model: 'mock-hermes', modelFull: 'mock-hermes' }
    }
  }

  async listWorkspaces(): Promise<Workspace[]> {
    const locale = readLocale()
    try {
      const { sessions } = await fetchJson<{ sessions: ApiSession[] }>(sessionsUrl())
      this.useMock = false
      if (sessions.length === 0) {
        return [{
          id: 'ws-local-hermes',
          name: locale === 'en' ? 'Local Hermes' : 'Local Hermes ZH',
          kind: 'local',
          path: '~/.hermes',
          updatedAt: locale === 'en' ? 'just now' : 'just now',
          taskIds: [],
        }]
      }
      const byCwd = new Map<string, ApiSession[]>()
      for (const s of sessions) {
        const cwd = s.cwd || '/workspace'
        const list = byCwd.get(cwd) ?? []
        list.push(s)
        byCwd.set(cwd, list)
      }
      const workspaces: Workspace[] = []
      for (const [cwd, list] of byCwd) {
        const newest = list[0]
        workspaces.push({
          id: workspaceIdFromCwd(cwd),
          name: workspaceName(cwd, locale),
          kind: 'local',
          path: cwd,
          updatedAt: newest?.updatedAt ?? (locale === 'en' ? 'unknown' : 'unknown'),
          taskIds: list.map((s) => s.id),
        })
      }
      return workspaces
    } catch {
      this.useMock = true
      return mockAdapter.listWorkspaces()
    }
  }

  async listTasks(workspaceId?: string): Promise<Task[]> {
    try {
      const { sessions } = await fetchJson<{ sessions: ApiSession[] }>(sessionsUrl())
      this.useMock = false
      const tasks: Task[] = sessions.map((s) => ({
        id: s.id,
        workspaceId: workspaceIdFromCwd(s.cwd || '/workspace'),
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
      }))
      return workspaceId ? tasks.filter((t) => t.workspaceId === workspaceId) : tasks
    } catch {
      this.useMock = true
      return mockAdapter.listTasks(workspaceId)
    }
  }

  async getChat(taskId: string): Promise<ChatSession> {
    if (this.useMock) return mockAdapter.getChat(taskId)
    try {
      return await fetchJson<ChatSession>(`/api/hermes/sessions/${encodeURIComponent(taskId)}`)
    } catch {
      return mockAdapter.getChat(taskId)
    }
  }

  async startSession(cwd: string, message: string): Promise<{ sessionId: string; reply: string }> {
    return fetchJson('/api/hermes/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd, message }),
    })
  }

  async sendMessage(taskId: string, content: string): Promise<{ blocks: ChatBlock[]; sessionId: string }> {
    if (this.useMock) return { blocks: await mockAdapter.sendMessage(taskId, content), sessionId: taskId }
    const user: ChatBlock = { kind: 'user', id: `u-${Date.now()}`, content }
    try {
      const result = await fetchJson<{ reply: string; sessionId: string; raw?: string }>(
        '/api/hermes/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: taskId || undefined, message: content }),
        },
      )
      const reply: ChatBlock = {
        kind: 'text',
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.reply || '(empty reply)',
      }
      return { blocks: [user, reply], sessionId: result.sessionId }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'send failed'
      const reply: ChatBlock = {
        kind: 'text',
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `WARN ${msg}`,
      }
      return { blocks: [user, reply], sessionId: taskId }
    }
  }

  isUsingMock(): boolean {
    return this.useMock
  }
}

export const hermesAdapter = new HermesAdapter()
