import { getMockBundle } from '../data/mock'
import { LOCALE_STORAGE_KEY } from '../constants'
import type { Locale } from '../i18n/messages'
import type { ChatBlock, ChatSession, Task, Workspace } from '../types'

function readLocale(): Locale {
  try {
    const v = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (v === 'en' || v === 'zh') return v
  } catch {
    /* ignore */
  }
  return 'zh'
}

/** Offline fallback when `/api/hermes` is unreachable */
export class MockHermesAdapter {
  private sessionsByLocale: Partial<Record<Locale, Record<string, ChatSession>>> =
    {}

  private locale(): Locale {
    return readLocale()
  }

  private bundle(locale?: Locale) {
    return getMockBundle(locale ?? this.locale())
  }

  private sessions(locale?: Locale): Record<string, ChatSession> {
    const loc = locale ?? this.locale()
    if (!this.sessionsByLocale[loc]) {
      this.sessionsByLocale[loc] = this.bundle(loc).chatSessions
    }
    return this.sessionsByLocale[loc]!
  }

  async listWorkspaces(): Promise<Workspace[]> {
    await delay(80)
    return this.bundle().workspaces
  }

  async listTasks(workspaceId?: string): Promise<Task[]> {
    await delay(60)
    const all = this.bundle().tasks
    return workspaceId ? all.filter((t) => t.workspaceId === workspaceId) : all
  }

  async getChat(taskId: string): Promise<ChatSession> {
    await delay(60)
    const locale = this.locale()
    const session = this.sessions(locale)[taskId]
    if (session) return structuredClone(session)
    const task = this.bundle(locale).tasks.find((t) => t.id === taskId)
    if (locale === 'en') {
      return {
        taskId,
        blocks: [
          {
            kind: 'text',
            id: `${taskId}-empty`,
            role: 'assistant',
            content: task
              ? `Task "${task.title}" has no detailed session log (offline demo).`
              : 'Session not found for this task.',
          },
        ],
      }
    }
    return {
      taskId,
      blocks: [
        {
          kind: 'text',
          id: `${taskId}-empty`,
          role: 'assistant',
          content: task
            ? `任务「${task.title}」暂无详细会话记录（离线演示数据）。`
            : '未找到该任务的会话。',
        },
      ],
    }
  }

  async sendMessage(taskId: string, content: string): Promise<ChatBlock[]> {
    await delay(120)
    const locale = this.locale()
    const user: ChatBlock = {
      kind: 'user',
      id: `u-${Date.now()}`,
      content,
    }
    const reply: ChatBlock = {
      kind: 'text',
      id: `a-${Date.now()}`,
      role: 'assistant',
      content:
        locale === 'en'
          ? `(Offline mock) Got it: "${content}". Please confirm the local Hermes API is available.`
          : `（离线 Mock）已收到：「${content}」。请确认本机 Hermes API 可用。`,
    }
    const existing = this.sessions(locale)[taskId]
    if (existing) {
      existing.blocks.push(user, reply)
    }
    return [user, reply]
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockHermesAdapter = new MockHermesAdapter()
