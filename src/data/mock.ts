import type { ChatSession, Task, Workspace } from '../types'
import type { Locale } from '../i18n/messages'

/** Return fresh data so demo conversations cannot mutate another locale. */
export function getMockBundle(locale: Locale) {
  const bundle = structuredClone({ workspaces, tasks, chatSessions })
  if (locale === 'zh') return bundle
  const translations: Record<string, string> = {
    '刚刚': 'just now', '1天': '1 day ago', '2小时': '2 hours ago',
    '（离线）示例会话': '(Demo) Example conversation',
    '（离线）查出口 IP': '(Demo) Check public IP',
    '（离线）介绍 Hermes': '(Demo) About Hermes',
    '（离线）桌面交还演示': '(Demo) Desktop handoff',
    '你好': 'Hello',
    '你好！这是离线演示数据。连上本机 Hermes 后会显示真实会话。': 'Hello! This is demo data. Connect to local Hermes to see real conversations.',
    '查一下本机出口 IP': 'Check the public IP of this machine',
    '（离线演示）出口 IP 示例：203.0.113.42': '(Demo) Example public IP: 203.0.113.42',
    '帮我介绍一下 Hermes': 'Tell me about Hermes',
    'Hermes Agent 是本机 AI 助手；本 Web Shell 通过 /api/hermes 读取会话并用 hermes -z 续聊。': 'Hermes Agent is a local AI assistant. This shell reads sessions through /api/hermes and continues them through hermes -z.',
    '可以把屏幕交给你操作，完成后点「交还」。': 'Open the desktop to take control, then select Return when finished.',
    '电脑': 'Computer',
    '查看当前远程桌面。完成后点击交还继续任务。': 'View the remote desktop. Select Return to continue the task.',
  }
  for (const item of [...bundle.workspaces, ...bundle.tasks]) {
    item.updatedAt = translations[item.updatedAt] ?? item.updatedAt
  }
  for (const task of bundle.tasks) task.title = translations[task.title] ?? task.title
  for (const session of Object.values(bundle.chatSessions)) {
    for (const block of session.blocks) {
      if ('content' in block) block.content = translations[block.content] ?? block.content
      if (block.kind === 'handoff') {
        block.title = translations[block.title] ?? block.title
        block.description = translations[block.description] ?? block.description
      }
    }
  }
  return bundle
}

/** Offline fallback only — real data comes from /api/hermes */
export const workspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'workspace',
    kind: 'local',
    path: '/workspace',
    updatedAt: '刚刚',
    taskIds: ['t-1', 't-2'],
  },
  {
    id: 'ws-2',
    name: 'hermes-agent',
    kind: 'local',
    path: '~/.hermes/hermes-agent',
    updatedAt: '1天',
    taskIds: ['t-3'],
  },
  {
    id: 'ws-3',
    name: 'hermes-web-shell',
    kind: 'local',
    path: '/workspace/hermes-web-shell',
    updatedAt: '刚刚',
    taskIds: ['t-4'],
  },
]

export const tasks: Task[] = [
  {
    id: 't-1',
    workspaceId: 'ws-1',
    title: '（离线）示例会话',
    status: 'completed',
    updatedAt: '刚刚',
  },
  {
    id: 't-2',
    workspaceId: 'ws-1',
    title: '（离线）查出口 IP',
    status: 'completed',
    updatedAt: '2小时',
  },
  {
    id: 't-3',
    workspaceId: 'ws-2',
    title: '（离线）介绍 Hermes',
    status: 'completed',
    updatedAt: '1天',
  },
  {
    id: 't-4',
    workspaceId: 'ws-3',
    title: '（离线）桌面交还演示',
    status: 'running',
    updatedAt: '刚刚',
  },
]

export const chatSessions: Record<string, ChatSession> = {
  't-1': {
    taskId: 't-1',
    blocks: [
      { kind: 'user', id: 'n1', content: '你好' },
      {
        kind: 'text',
        id: 'n2',
        role: 'assistant',
        content: '你好！这是离线演示数据。连上本机 Hermes 后会显示真实会话。',
      },
    ],
  },
  't-2': {
    taskId: 't-2',
    blocks: [
      { kind: 'user', id: 'p1', content: '查一下本机出口 IP' },
      {
        kind: 'terminal',
        id: 'p2',
        command: 'curl -s https://api.ipify.org && echo',
      },
      {
        kind: 'text',
        id: 'p3',
        role: 'assistant',
        content: '（离线演示）出口 IP 示例：203.0.113.42',
      },
    ],
  },
  't-3': {
    taskId: 't-3',
    blocks: [
      { kind: 'user', id: 'i1', content: '帮我介绍一下 Hermes' },
      {
        kind: 'text',
        id: 'i3',
        role: 'assistant',
        content:
          'Hermes Agent 是本机 AI 助手；本 Web Shell 通过 /api/hermes 读取会话并用 hermes -z 续聊。',
      },
    ],
  },
  't-4': {
    taskId: 't-4',
    blocks: [
      {
        kind: 'text',
        id: 'h1',
        role: 'assistant',
        content: '可以把屏幕交给你操作，完成后点「交还」。',
      },
      {
        kind: 'handoff',
        id: 'h3',
        title: '电脑',
        status: 'pending',
        description: '查看当前远程桌面。完成后点击交还继续任务。',
      },
    ],
  },
}
