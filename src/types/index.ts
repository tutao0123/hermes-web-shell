export type WorkspaceKind = 'local' | 'remote'
export type TaskStatus = 'running' | 'completed' | 'pending'

export interface Task {
  id: string
  draft?: boolean
  workspaceId: string
  title: string
  status: TaskStatus
  updatedAt: string
}

export interface Workspace {
  id: string
  name: string
  kind: WorkspaceKind
  path: string
  updatedAt: string
  taskIds: string[]
}

export type ChatBlockKind = 'text' | 'terminal' | 'thinking' | 'handoff' | 'user'

export interface TerminalBlock {
  kind: 'terminal'
  id: string
  command: string
  diff?: { file: string; added: number; removed: number }
}

export interface ThinkingBlock {
  kind: 'thinking'
  id: string
  summary: string
  duration: string
}

export interface TextBlock {
  kind: 'text'
  id: string
  role: 'assistant' | 'system'
  content: string
}

export interface UserBlock {
  kind: 'user'
  id: string
  content: string
}

export interface HandoffBlock {
  kind: 'handoff'
  id: string
  title: string
  status: 'pending' | 'completed'
  description: string
}

export type ChatBlock =
  | TerminalBlock
  | ThinkingBlock
  | TextBlock
  | UserBlock
  | HandoffBlock

export interface ChatSession {
  taskId: string
  blocks: ChatBlock[]
}

export type AppView =
  | { name: 'workspaces' }
  | { name: 'tasks'; workspaceId: string }
  | { name: 'chat'; workspaceId: string; taskId: string }
