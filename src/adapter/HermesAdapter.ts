import type { ChatBlock, ChatSession, Task, TaskStatus, Workspace } from '../types'
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

function workspaceIdFromCwd(cwd: string): string {
  // stable, URL-safe id from path
  return `ws-${btoa(unescape(encodeURIComponent(cwd)))
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')}`
}

function workspaceName(cwd: string): string {
  const parts = cwd.replace(/\/+$/, '').split('/').filter(Boolean)
  return parts[parts.length - 1] || cwd || '本机 Hermes'
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`)
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
      return {
        version: 'mock',
        model: 'mock-hermes',
        modelFull: 'mock-hermes',
      }
    }
  }

  async listWorkspaces(): Promise<Workspace[]> {
    try {
      const { sessions } = await fetchJson<{ sessions: ApiSession[] }>(
        '/api/hermes/sessions',
      )
      this.useMock = false
      if (sessions.length === 0) {
        return [
          {
            id: 'ws-local-hermes',
            name: '本机 Hermes',
            kind: 'local',
            path: '~/.hermes',
            updatedAt: '刚刚',
            taskIds: [],
          },
        ]
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
          name: workspaceName(cwd),
          kind: 'local',
          path: cwd,
          updatedAt: newest?.updatedAt ?? '未知',
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
      const { sessions } = await fetchJson<{ sessions: ApiSession[] }>(
        '/api/hermes/sessions',
      )
      this.useMock = false
      const tasks: Task[] = sessions.map((s) => ({
        id: s.id,
        workspaceId: workspaceIdFromCwd(s.cwd || '/workspace'),
        title: s.title,
        status: s.status,
        updatedAt: s.updatedAt,
      }))
      return workspaceId
        ? tasks.filter((t) => t.workspaceId === workspaceId)
        : tasks
    } catch {
      this.useMock = true
      return mockAdapter.listTasks(workspaceId)
    }
  }

  async getChat(taskId: string): Promise<ChatSession> {
    if (this.useMock) return mockAdapter.getChat(taskId)
    try {
      const data = await fetchJson<ChatSession>(
        `/api/hermes/sessions/${encodeURIComponent(taskId)}`,
      )
      return data
    } catch {
      return mockAdapter.getChat(taskId)
    }
  }

  async sendMessage(taskId: string, content: string): Promise<ChatBlock[]> {
    if (this.useMock) return mockAdapter.sendMessage(taskId, content)

    const user: ChatBlock = {
      kind: 'user',
      id: `u-${Date.now()}`,
      content,
    }

    try {
      const result = await fetchJson<{
        reply: string
        sessionId: string
        raw?: string
      }>('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: taskId || undefined,
          message: content,
        }),
      })

      const reply: ChatBlock = {
        kind: 'text',
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.reply || '（无文本回复）',
      }
      return [user, reply]
    } catch (e) {
      const msg = e instanceof Error ? e.message : '发送失败'
      const reply: ChatBlock = {
        kind: 'text',
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${msg}`,
      }
      return [user, reply]
    }
  }

  isUsingMock(): boolean {
    return this.useMock
  }
}

export const hermesAdapter = new HermesAdapter()
