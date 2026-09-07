import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const HERMES_HOME = process.env.HERMES_HOME || join(homedir(), '.hermes')
const STATE_DB = join(HERMES_HOME, 'state.db')
const HERMES_BIN = process.env.HERMES_BIN || 'hermes'
const DASHBOARD_STATUS = 'http://127.0.0.1:9119/api/status'
const CHAT_TIMEOUT_MS = 120_000
const RUNNING_WINDOW_MS = 90_000

type SessionRow = {
  id: string
  title: string | null
  cwd: string | null
  model: string | null
  message_count: number | null
  last_activity_at: number | null
  ended_at: number | null
  started_at: number
  archived: number
  hidden: number
}

type MessageRow = {
  id: number
  session_id: string
  role: string
  content: string | null
  tool_calls: string | null
  tool_name: string | null
  reasoning: string | null
  reasoning_content: string | null
  timestamp: number
  active: number
}

function openDb() {
  return new DatabaseSync(STATE_DB, { readOnly: true })
}

function relativeZh(ts: number | null | undefined): string {
  if (ts == null || !Number.isFinite(ts)) return '未知'
  const diffMs = Date.now() - ts * 1000
  if (diffMs < 0) return '刚刚'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return '刚刚'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} 个月前`
  return `${Math.floor(month / 12)} 年前`
}

function sessionStatus(row: SessionRow): 'running' | 'completed' {
  const anchor = row.last_activity_at ?? row.ended_at ?? row.started_at
  if (row.ended_at == null && Date.now() - anchor * 1000 < RUNNING_WINDOW_MS) {
    return 'running'
  }
  if (Date.now() - anchor * 1000 < RUNNING_WINDOW_MS) return 'running'
  return 'completed'
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
) {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(payload)
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function fetchDashboardStatus(): Promise<Record<string, unknown>> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    const res = await fetch(DASHBOARD_STATUS, { signal: ctrl.signal })
    clearTimeout(timer)
    if (res.ok) {
      return (await res.json()) as Record<string, unknown>
    }
  } catch {
    /* fall through */
  }
  return fallbackStatus()
}

function fallbackStatus(): Record<string, unknown> {
  let model = 'google/gemma-4-31b-it:free'
  let version = '0.21.0'
  try {
    const cfg = readFileSync(join(HERMES_HOME, 'config.yaml'), 'utf8')
    const m = cfg.match(/^\s*default:\s*(.+)$/m)
    if (m) model = m[1].trim()
  } catch {
    /* ignore */
  }
  try {
    const stamp = readFileSync(
      join(HERMES_HOME, 'web-ui-build-stamp.json'),
      'utf8',
    )
    const j = JSON.parse(stamp) as { version?: string }
    if (j.version) version = j.version
  } catch {
    /* ignore */
  }
  return {
    version,
    model,
    gateway_running: false,
    overall: 'unknown',
    source: 'fallback',
  }
}

function listSessions() {
  const db = openDb()
  try {
    const rows = db
      .prepare(
        `SELECT id, title, cwd, model, message_count, last_activity_at, ended_at, started_at, archived, hidden
         FROM sessions
         WHERE archived = 0 AND hidden = 0
         ORDER BY COALESCE(last_activity_at, ended_at, started_at) DESC`,
      )
      .all() as SessionRow[]
    return rows.map((row) => {
      const updated = row.last_activity_at ?? row.ended_at ?? row.started_at
      return {
        id: row.id,
        title: row.title || row.id,
        cwd: row.cwd || HERMES_HOME,
        model: row.model || null,
        message_count: row.message_count ?? 0,
        updatedAt: relativeZh(updated),
        updatedAtTs: updated,
        status: sessionStatus(row),
      }
    })
  } finally {
    db.close()
  }
}

function mapMessages(sessionId: string) {
  const db = openDb()
  try {
    const rows = db
      .prepare(
        `SELECT id, session_id, role, content, tool_calls, tool_name, reasoning, reasoning_content, timestamp, active
         FROM messages
         WHERE session_id = ? AND active = 1
         ORDER BY timestamp ASC, id ASC`,
      )
      .all(sessionId) as MessageRow[]

    const blocks: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const reasoning = row.reasoning_content || row.reasoning
      if (reasoning && row.role === 'assistant') {
        blocks.push({
          kind: 'thinking',
          id: `think-${row.id}`,
          summary: String(reasoning).slice(0, 800),
          duration: '思考',
        })
      }

      if (row.tool_calls) {
        try {
          const calls = JSON.parse(row.tool_calls) as Array<{
            function?: { name?: string; arguments?: string }
            name?: string
            arguments?: string
          }>
          for (let i = 0; i < calls.length; i++) {
            const call = calls[i]
            const name = call.function?.name || call.name || 'tool'
            const args = call.function?.arguments || call.arguments || ''
            let pretty = args
            try {
              pretty = JSON.stringify(JSON.parse(args), null, 2)
            } catch {
              /* keep raw */
            }
            blocks.push({
              kind: 'terminal',
              id: `tool-${row.id}-${i}`,
              command: `${name}\n${pretty}`.trim(),
            })
          }
        } catch {
          blocks.push({
            kind: 'terminal',
            id: `tool-${row.id}`,
            command: row.tool_calls,
          })
        }
      }

      if (row.role === 'user' && row.content) {
        blocks.push({
          kind: 'user',
          id: `user-${row.id}`,
          content: row.content,
        })
      } else if (row.role === 'assistant' && row.content) {
        blocks.push({
          kind: 'text',
          id: `asst-${row.id}`,
          role: 'assistant',
          content: row.content,
        })
      } else if (row.role === 'tool') {
        const label = row.tool_name || 'tool'
        const body = row.content || ''
        blocks.push({
          kind: 'terminal',
          id: `toolres-${row.id}`,
          command: `# ${label} result\n${body}`.slice(0, 4000),
        })
      }
    }

    if (blocks.length === 0) {
      blocks.push({
        kind: 'text',
        id: `${sessionId}-empty`,
        role: 'assistant',
        content: '该会话暂无消息记录。',
      })
    }

    return { taskId: sessionId, blocks }
  } finally {
    db.close()
  }
}

function chineseError(raw: string, code?: number | null): string {
  const text = raw || ''
  if (code === 429 || /429|rate.?limit|too many requests/i.test(text)) {
    return 'OpenRouter 免费模型暂时限流（429），请稍后再试。'
  }
  if (/timeout|ETIMEDOUT|timed out/i.test(text)) {
    return 'Hermes 响应超时，请稍后重试。'
  }
  if (/ECONNREFUSED|ENOENT/i.test(text)) {
    return '无法启动本机 Hermes，请确认已安装并可执行。'
  }
  const trimmed = text.replace(/\s+/g, ' ').trim().slice(0, 240)
  return trimmed
    ? `Hermes 调用失败：${trimmed}`
    : 'Hermes 调用失败，请稍后重试。'
}

function runHermesChat(
  message: string,
  sessionId?: string,
): Promise<{ reply: string; sessionId: string; raw: string }> {
  return new Promise((resolve, reject) => {
    const dir = mkdtempSync(join(tmpdir(), 'hermes-web-'))
    const usagePath = join(dir, 'usage.json')
    const args = ['-z', message, '--usage-file', usagePath, '--yolo']
    if (sessionId) {
      args.push('--resume', sessionId)
    }

    const env = {
      ...process.env,
      PATH: `${join(homedir(), '.local', 'bin')}:${process.env.PATH || ''}`,
      HERMES_HOME,
    }

    const child = spawn(HERMES_BIN, args, {
      env,
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill('SIGKILL')
      cleanup()
      reject(new Error('timeout'))
    }, CHAT_TIMEOUT_MS)

    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })

    function cleanup() {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }

    child.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cleanup()
      reject(err)
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      let usage: Record<string, unknown> = {}
      try {
        usage = JSON.parse(readFileSync(usagePath, 'utf8')) as Record<
          string,
          unknown
        >
      } catch {
        /* may be missing on hard fail */
      }

      const usageSession =
        typeof usage.session_id === 'string' ? usage.session_id : ''
      const failed = usage.failed === true || (code !== 0 && !stdout.trim())
      const combined = `${stdout}\n${stderr}`

      if (failed || code !== 0) {
        cleanup()
        const err = new Error(chineseError(combined, null))
        ;(err as Error & { statusHint?: number }).statusHint = /429/.test(
          combined,
        )
          ? 429
          : 502
        ;(err as Error & { raw?: string }).raw = combined
        reject(err)
        return
      }

      let resolvedId = usageSession || sessionId || ''
      if (!resolvedId) {
        try {
          const db = openDb()
          const latest = db
            .prepare(
              `SELECT id FROM sessions ORDER BY started_at DESC LIMIT 1`,
            )
            .get() as { id: string } | undefined
          db.close()
          if (latest?.id) resolvedId = latest.id
        } catch {
          /* ignore */
        }
      }

      cleanup()
      resolve({
        reply: stdout.trim(),
        sessionId: resolvedId || 'unknown',
        raw: combined,
      })
    })
  })
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
): Promise<boolean> {
  const path = url.pathname

  if (req.method === 'GET' && path === '/api/hermes/status') {
    const dash = await fetchDashboardStatus()
    let model =
      (typeof dash.model === 'string' && dash.model) ||
      (dash as { config?: { model?: string } }).config?.model
    if (!model) {
      try {
        const cfg = readFileSync(join(HERMES_HOME, 'config.yaml'), 'utf8')
        const m = cfg.match(/^\s*default:\s*(.+)$/m)
        if (m) model = m[1].trim()
      } catch {
        model = 'google/gemma-4-31b-it:free'
      }
    }
    const modelFull = String(model)
    const modelShort = modelFull.includes('/')
      ? modelFull.split('/').slice(1).join('/')
      : modelFull
    sendJson(res, 200, {
      version: dash.version ?? '0.21.0',
      model: modelShort,
      modelFull,
      gateway: {
        running: Boolean(dash.gateway_running),
        state: dash.gateway_state ?? null,
        overall: dash.overall ?? null,
      },
      dashboard: dash,
    })
    return true
  }

  if (req.method === 'GET' && path === '/api/hermes/sessions') {
    try {
      sendJson(res, 200, { sessions: listSessions() })
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : '读取会话失败',
      })
    }
    return true
  }

  const sessionMatch = path.match(/^\/api\/hermes\/sessions\/([^/]+)$/)
  if (req.method === 'GET' && sessionMatch) {
    const id = decodeURIComponent(sessionMatch[1])
    try {
      sendJson(res, 200, mapMessages(id))
    } catch (e) {
      sendJson(res, 500, {
        error: e instanceof Error ? e.message : '读取消息失败',
      })
    }
    return true
  }

  if (req.method === 'POST' && path === '/api/hermes/chat') {
    try {
      const raw = await readBody(req)
      const body = JSON.parse(raw || '{}') as {
        sessionId?: string
        message?: string
      }
      const message = (body.message || '').trim()
      if (!message) {
        sendJson(res, 400, { error: '消息不能为空' })
        return true
      }
      const result = await runHermesChat(message, body.sessionId)
      sendJson(res, 200, result)
    } catch (e) {
      const err = e as Error & { statusHint?: number; raw?: string }
      const msg =
        err.message === 'timeout'
          ? 'Hermes 响应超时，请稍后重试。'
          : chineseError(err.message || String(e), err.statusHint)
      sendJson(res, 502, { error: msg, raw: err.raw?.slice(0, 2000) })
    }
    return true
  }

  return false
}

export function hermesApiPlugin(): Plugin {
  return {
    name: 'hermes-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const host = req.headers.host || '127.0.0.1'
          const url = new URL(req.url || '/', `http://${host}`)
          if (!url.pathname.startsWith('/api/hermes')) {
            next()
            return
          }
          const handled = await handleApi(req, res, url)
          if (!handled) next()
        } catch (e) {
          if (!res.headersSent) {
            sendJson(res, 500, {
              error: e instanceof Error ? e.message : '内部错误',
            })
          }
        }
      })
    },
  }
}
