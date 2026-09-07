export type Locale = 'zh' | 'en'

export type MessageKey =
  | 'gate.subtitle'
  | 'gate.passwordPlaceholder'
  | 'gate.enter'
  | 'gate.wrongPassword'
  | 'loading.connecting'
  | 'loading.session'
  | 'workspaces.subtitle'
  | 'workspaces.banner'
  | 'workspaces.sectionTitle'
  | 'workspaces.meta'
  | 'workspaces.collapse'
  | 'workspaces.refresh'
  | 'workspaces.openWorkspace'
  | 'workspaces.local'
  | 'workspaces.remote'
  | 'workspaces.updatedAt'
  | 'workspaces.taskCount'
  | 'tasks.listTitle'
  | 'tasks.meta'
  | 'tasks.updatedAt'
  | 'chat.sessionTitle'
  | 'chat.loading'
  | 'chat.composerPlaceholder'
  | 'chat.send'
  | 'chat.terminal'
  | 'chat.changes'
  | 'chat.thinking'
  | 'chat.handoffTitle'
  | 'chat.handoffCompleted'
  | 'chat.handoffRunning'
  | 'chat.openDesktop'
  | 'status.running'
  | 'status.completed'
  | 'status.pending'
  | 'desktop.remote'
  | 'desktop.mockTitle'
  | 'desktop.return'
  | 'desktop.iframeTitle'
  | 'desktop.fakeWindowTitle'
  | 'desktop.loginHeading'
  | 'desktop.mockHint'
  | 'desktop.accountPlaceholder'
  | 'desktop.passwordPlaceholder'
  | 'desktop.loginDemo'
  | 'desktop.returnHint'
  | 'prefs.localeZh'
  | 'prefs.localeEn'
  | 'prefs.themeLight'
  | 'prefs.themeDark'
  | 'prefs.localeLabel'
  | 'prefs.themeLabel'

const zh: Record<MessageKey, string> = {
  'gate.subtitle': '输入访问密码以继续（演示）',
  'gate.passwordPlaceholder': '密码',
  'gate.enter': '进入',
  'gate.wrongPassword': '密码错误，演示密码为 demo',
  'loading.connecting': '正在连接 Hermes…',
  'loading.session': '加载会话…',
  'workspaces.subtitle': '本机 Hermes · OpenRouter 模型会话',
  'workspaces.banner':
    '已连接本机 Hermes Agent。工作区按会话工作目录（cwd）分组，任务即真实 Hermes 会话。',
  'workspaces.sectionTitle': '当前设备上的工作区和任务',
  'workspaces.meta': '{workspaces} 个工作区 · {tasks} 个任务',
  'workspaces.collapse': '折叠',
  'workspaces.refresh': '刷新',
  'workspaces.openWorkspace': '打开工作区',
  'workspaces.local': '本地',
  'workspaces.remote': '远程',
  'workspaces.updatedAt': '更新于 {time}',
  'workspaces.taskCount': '{count} 个任务',
  'tasks.listTitle': '任务列表',
  'tasks.meta': '{count} 个任务',
  'tasks.updatedAt': '更新于 {time}',
  'chat.sessionTitle': '任务会话',
  'chat.loading': '加载会话…',
  'chat.composerPlaceholder': '继续输入以排队后续修改',
  'chat.send': '发送',
  'chat.terminal': '终端',
  'chat.changes': '更改',
  'chat.thinking': '思考',
  'chat.handoffTitle': '「电脑」',
  'chat.handoffCompleted': '完成',
  'chat.handoffRunning': '进行中',
  'chat.openDesktop': '🖥 打开电脑',
  'status.running': '运行中',
  'status.completed': '已完成',
  'status.pending': '待处理',
  'desktop.remote': '远程桌面',
  'desktop.mockTitle': '模拟桌面 · 演示模式',
  'desktop.return': '交还',
  'desktop.iframeTitle': '远程桌面',
  'desktop.fakeWindowTitle': '登录 - 演示站点',
  'desktop.loginHeading': '请完成登录',
  'desktop.mockHint': '这是 Mock 桌面叠加层，用于演示「打开电脑 / 交还」流程。',
  'desktop.accountPlaceholder': '账号',
  'desktop.passwordPlaceholder': '密码',
  'desktop.loginDemo': '登录（演示）',
  'desktop.returnHint': '完成后点击右上角「交还」返回会话。',
  'prefs.localeZh': '中文',
  'prefs.localeEn': 'EN',
  'prefs.themeLight': '亮',
  'prefs.themeDark': '暗',
  'prefs.localeLabel': '语言',
  'prefs.themeLabel': '主题',
}

const en: Record<MessageKey, string> = {
  'gate.subtitle': 'Enter access password to continue (demo)',
  'gate.passwordPlaceholder': 'Password',
  'gate.enter': 'Enter',
  'gate.wrongPassword': 'Wrong password — demo password is demo',
  'loading.connecting': 'Connecting to Hermes…',
  'loading.session': 'Loading session…',
  'workspaces.subtitle': 'Local Hermes · OpenRouter model sessions',
  'workspaces.banner':
    'Connected to local Hermes Agent. Workspaces group by session cwd; tasks are real Hermes sessions.',
  'workspaces.sectionTitle': 'Workspaces & tasks on this device',
  'workspaces.meta': '{workspaces} workspaces · {tasks} tasks',
  'workspaces.collapse': 'Collapse',
  'workspaces.refresh': 'Refresh',
  'workspaces.openWorkspace': 'Open workspace',
  'workspaces.local': 'Local',
  'workspaces.remote': 'Remote',
  'workspaces.updatedAt': 'Updated {time}',
  'workspaces.taskCount': '{count} tasks',
  'tasks.listTitle': 'Tasks',
  'tasks.meta': '{count} tasks',
  'tasks.updatedAt': 'Updated {time}',
  'chat.sessionTitle': 'Task session',
  'chat.loading': 'Loading session…',
  'chat.composerPlaceholder': 'Type to queue follow-up changes',
  'chat.send': 'Send',
  'chat.terminal': 'Terminal',
  'chat.changes': 'Changes',
  'chat.thinking': 'Thinking',
  'chat.handoffTitle': '“Computer”',
  'chat.handoffCompleted': 'Done',
  'chat.handoffRunning': 'In progress',
  'chat.openDesktop': '🖥 Open computer',
  'status.running': 'Running',
  'status.completed': 'Completed',
  'status.pending': 'Pending',
  'desktop.remote': 'Remote desktop',
  'desktop.mockTitle': 'Mock desktop · demo mode',
  'desktop.return': 'Return',
  'desktop.iframeTitle': 'Remote desktop',
  'desktop.fakeWindowTitle': 'Sign in - demo site',
  'desktop.loginHeading': 'Please sign in',
  'desktop.mockHint':
    'This is a mock desktop overlay to demo the “open computer / return” flow.',
  'desktop.accountPlaceholder': 'Account',
  'desktop.passwordPlaceholder': 'Password',
  'desktop.loginDemo': 'Sign in (demo)',
  'desktop.returnHint': 'When done, click “Return” in the top-right to go back.',
  'prefs.localeZh': '中文',
  'prefs.localeEn': 'EN',
  'prefs.themeLight': 'Light',
  'prefs.themeDark': 'Dark',
  'prefs.localeLabel': 'Language',
  'prefs.themeLabel': 'Theme',
}

export const messages: Record<Locale, Record<MessageKey, string>> = { zh, en }

export function formatMessage(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  )
}
