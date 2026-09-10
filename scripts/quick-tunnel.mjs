#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const stateDir = join(homedir(), '.hermes-web-shell')
const keyFile = join(stateDir, 'local-pairing-key.txt')
const pidFile = join(stateDir, 'quick-tunnel.pid')

function findCloudflared() {
  const candidates = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'cloudflared',
  ]
  for (const c of candidates) {
    if (c === 'cloudflared') continue
    if (existsSync(c)) return c
  }
  return 'cloudflared'
}

async function ensureServerReady(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/auth/status`, { signal: AbortSignal.timeout(1500) })
    if (res.ok) return true
  } catch {}
  return false
}

async function main() {
  const action = process.argv[2] || 'start'
  const port = process.env.SHELL_PORT || '5174'
  const baseUrl = `http://127.0.0.1:${port}`

  if (action === 'stop') {
    if (existsSync(pidFile)) {
      const pid = Number(readFileSync(pidFile, 'utf8').trim())
      try {
        process.kill(pid)
        console.log(JSON.stringify({ success: true, message: `已停止临时隧道进程 (PID: ${pid})` }))
      } catch {
        console.log(JSON.stringify({ success: true, message: `临时隧道进程已不存在` }))
      }
      try { rmSync(pidFile) } catch {}
    } else {
      console.log(JSON.stringify({ success: true, message: `未检测到正在运行的临时隧道` }))
    }
    return
  }

  const isRunning = await ensureServerReady(baseUrl)
  if (!isRunning) {
    console.error(JSON.stringify({ error: `Hermes Web Shell 服务未在 ${baseUrl} 运行，请先启动服务。` }))
    process.exit(1)
  }

  let localKey = ''
  try {
    localKey = readFileSync(keyFile, 'utf8').trim()
  } catch {
    console.error(JSON.stringify({ error: `未找到配对秘钥文件: ${keyFile}` }))
    process.exit(1)
  }

  const cloudflaredBin = findCloudflared()
  const child = spawn(cloudflaredBin, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  child.unref()

  if (child.pid) {
    writeFileSync(pidFile, String(child.pid))
  }

  let capturedUrl = ''
  const timeoutTimer = setTimeout(() => {
    if (!capturedUrl) {
      console.error(JSON.stringify({ error: '获取 Cloudflare 临时隧道地址超时（15 秒），请检查网络连接或 cloudflared 安装。' }))
      try { child.kill() } catch {}
      process.exit(1)
    }
  }, 15000)

  let registered = false
  const onData = async (data) => {
    const text = data.toString()
    const m = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/)
    if (m && !capturedUrl) {
      capturedUrl = m[0]
    }
    if (text.includes('Registered tunnel connection') && capturedUrl && !registered) {
      registered = true
      clearTimeout(timeoutTimer)

      // Request pairing QR for this URL
      try {
        const res = await fetch(`${baseUrl}/auth/pair`, {
          method: 'POST',
          headers: {
            'x-hermes-local-key': localKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ publicUrl: capturedUrl }),
        })
        const pairData = await res.json()
        const qrPath = join(stateDir, 'pairing_qr.png')
        if (pairData.png) {
          const base64Data = pairData.png.replace(/^data:image\/png;base64,/, '')
          writeFileSync(qrPath, Buffer.from(base64Data, 'base64'))
        }

        console.log(JSON.stringify({
          success: true,
          mode: 'quick-tunnel',
          publicUrl: capturedUrl,
          link: pairData.link,
          qrPath: qrPath.replace(/\\/g, '/'),
          expires: pairData.expires,
          expiresInSeconds: Math.max(0, Math.ceil((pairData.expires - Date.now()) / 1000)),
          pid: child.pid,
          note: 'Cloudflare 免费临时隧道已就绪！手机可随时随地通过公网扫码连接。使用完成后可运行 npm run tunnel:stop 停止。'
        }, null, 2))

        child.stdout.destroy()
        child.stderr.destroy()
        setTimeout(() => process.exit(0), 100)
      } catch (err) {
        console.error(JSON.stringify({ error: err.message }))
        process.exit(1)
      }
    }
  }

  child.stdout.on('data', onData)
  child.stderr.on('data', onData)

  child.on('error', (err) => {
    clearTimeout(timeoutTimer)
    console.error(JSON.stringify({ error: `无法启动 cloudflared: ${err.message}` }))
    process.exit(1)
  })
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
