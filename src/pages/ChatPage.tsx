import { useEffect, useRef, useState, type FormEvent } from 'react'
import { DesktopOverlay } from '../components/DesktopOverlay'
import { PrefsToggles } from '../components/PrefsToggles'
import { hermesAdapter } from '../adapter/HermesAdapter'
import { useUiPrefs } from '../prefs/UiPrefs'
import type { ChatBlock, Task, Workspace } from '../types'

interface Props {
  workspace: Workspace
  task: Task
  modelName?: string
  onBack: () => void
}

export function ChatPage({ workspace, task, modelName = 'hermes', onBack }: Props) {
  const { t } = useUiPrefs()
  const [blocks, setBlocks] = useState<ChatBlock[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    hermesAdapter.getChat(task.id).then((session) => {
      if (!cancelled) {
        setBlocks(session.blocks)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [task.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [blocks, desktopOpen])

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    const added = await hermesAdapter.sendMessage(task.id, text)
    setBlocks((prev) => [...prev, ...added])
    setSending(false)
  }

  return (
    <div className="page chat-page">
      <header className="app-header compact sticky">
        <div className="header-top">
          <div className="header-row">
            <button type="button" className="icon-btn back" onClick={onBack}>
              ‹
            </button>
            <div className="grow">
              <h1>{t('chat.sessionTitle')}</h1>
            </div>
          </div>
          <PrefsToggles />
        </div>
        <div className="context-tabs">
          <span className="chip active">{task.title}</span>
          <span className="chip">📁 {workspace.name}</span>
        </div>
      </header>

      <div className="chat-thread">
        {loading ? <p className="muted center">{t('chat.loading')}</p> : null}
        {blocks.map((block) => (
          <ChatBlockView
            key={block.id}
            block={block}
            onOpenDesktop={() => setDesktopOpen(true)}
          />
        ))}
        {task.status === 'running' && !loading ? (
          <div className="typing" aria-hidden>
            <span className="sunburst" />
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form className="composer" onSubmit={handleSend}>
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat.composerPlaceholder')}
        />
        <div className="composer-row">
          <span className="composer-tools" aria-hidden>
            <span>+</span>
            <span className="model-chip">{modelName}</span>
          </span>
          <button
            type="submit"
            className="send-btn"
            disabled={sending || !input.trim()}
            aria-label={t('chat.send')}
          >
            ▶
          </button>
        </div>
      </form>

      <DesktopOverlay open={desktopOpen} onReturn={() => setDesktopOpen(false)} />
    </div>
  )
}

function ChatBlockView({
  block,
  onOpenDesktop,
}: {
  block: ChatBlock
  onOpenDesktop: () => void
}) {
  const { t } = useUiPrefs()

  if (block.kind === 'terminal') {
    return (
      <div className="block terminal-block">
        <div className="block-label">
          <span aria-hidden>⌘</span> {t('chat.terminal')}
          {block.diff ? (
            <span className="diff-badge">
              📄 {t('chat.changes')}{' '}
              <em className="add">+{block.diff.added}</em>{' '}
              <em className="del">-{block.diff.removed}</em>
            </span>
          ) : null}
        </div>
        <pre>{block.command}</pre>
      </div>
    )
  }

  if (block.kind === 'thinking') {
    return (
      <div className="block thinking-block">
        <div className="block-label">
          <span aria-hidden>🧠</span> {t('chat.thinking')}
          <span className="muted small">{block.duration}</span>
        </div>
        <p className="thinking-text">{block.summary}</p>
      </div>
    )
  }

  if (block.kind === 'handoff') {
    return (
      <div className="block handoff-card">
        <div className="handoff-head">
          <strong>{t('chat.handoffTitle')}</strong>
          <span
            className={`pill ${block.status === 'completed' ? 'pill-done' : 'pill-running'}`}
          >
            {block.status === 'completed'
              ? t('chat.handoffCompleted')
              : t('chat.handoffRunning')}
          </span>
        </div>
        <p>{block.description}</p>
        <button type="button" className="btn-outline" onClick={onOpenDesktop}>
          {t('chat.openDesktop')}
        </button>
      </div>
    )
  }

  if (block.kind === 'user') {
    return (
      <div className="block user-bubble">
        <p>{block.content}</p>
      </div>
    )
  }

  return (
    <div className="block assistant-text">
      <p>{block.content}</p>
    </div>
  )
}
