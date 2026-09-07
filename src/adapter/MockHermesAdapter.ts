import { chatSessions, tasks, workspaces } from '../data/mock'
import type { ChatBlock, ChatSession, Task, Workspace } from '../types'

/** Offline fallback when `/api/hermes` is unreachable */
export class MockHermesAdapter {
  async listWorkspaces(): Promise<Workspace[]> {
    await delay(80)
    return structuredClone(workspaces)
  }

  async listTasks(workspaceId?: string): Promise<Task[]> {
    await delay(60)
    const all = structuredClone(tasks)
    return workspaceId ? all.filter((t) => t.workspaceId === workspaceId) : all
  }

  async getChat(taskId: string): Promise<ChatSession> {
    await delay(60)
    const session = chatSessions[taskId]
    if (session) return structuredClone(session)
    const task = tasks.find((t) => t.id === taskId)
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
    const user: ChatBlock = {
      kind: 'user',
      id: `u-${Date.now()}`,
      content,
    }
    const reply: ChatBlock = {
      kind: 'text',
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: `（离线 Mock）已收到：「${content}」。请确认本机 Hermes API 可用。`,
    }
    const existing = chatSessions[taskId]
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
