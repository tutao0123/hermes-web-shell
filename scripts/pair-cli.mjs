#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const stateDir = join(homedir(), '.hermes-web-shell')
const keyFile = join(stateDir, 'local-pairing-key.txt')

async function ensureServerReady(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/auth/status`, { signal: AbortSignal.timeout(1500) })
    if (res.ok) return true
  } catch {}
  return false
}

async function main() {
  const action = process.argv[2] || 'pair'
  const port = process.env.SHELL_PORT || '5174'
  const baseUrl = `http://127.0.0.1:${port}`

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

  if (action === 'devices') {
    const res = await fetch(`${baseUrl}/auth/devices`, {
      headers: { 'x-hermes-local-key': localKey }
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (action === 'clear') {
    const res = await fetch(`${baseUrl}/auth/devices`, {
      headers: { 'x-hermes-local-key': localKey }
    })
    const data = await res.json()
    for (const session of data.sessions || []) {
      await fetch(`${baseUrl}/auth/revoke`, {
        method: 'POST',
        headers: {
          'x-hermes-local-key': localKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ id: session.id })
      })
    }
    console.log(JSON.stringify({ success: true, message: `已撤销所有 ${data.sessions?.length || 0} 个设备的授权` }))
    return
  }

  if (action === 'revoke') {
    const id = process.argv[3]
    if (!id) {
      console.error(JSON.stringify({ error: '请提供要注销的设备 ID' }))
      process.exit(1)
    }
    const res = await fetch(`${baseUrl}/auth/revoke`, {
      method: 'POST',
      headers: {
        'x-hermes-local-key': localKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ id })
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
    return
  }

  if (action === 'pair') {
    const res = await fetch(`${baseUrl}/auth/pair`, {
      method: 'POST',
      headers: {
        'x-hermes-local-key': localKey,
        'content-type': 'application/json'
      },
      body: '{}'
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error(JSON.stringify({ error: err.error || `请求失败 (${res.status})` }))
      process.exit(1)
    }

    const data = await res.json()
    const qrPath = join(stateDir, 'pairing_qr.png')
    if (data.png) {
      const base64Data = data.png.replace(/^data:image\/png;base64,/, '')
      writeFileSync(qrPath, Buffer.from(base64Data, 'base64'))
    }

    console.log(JSON.stringify({
      success: true,
      link: data.link,
      isLan: data.isLan,
      qrPath: qrPath.replace(/\\/g, '/'),
      expires: data.expires,
      expiresInSeconds: Math.max(0, Math.ceil((data.expires - Date.now()) / 1000))
    }, null, 2))
    return
  }

  console.error(JSON.stringify({ error: `未知操作: ${action}` }))
  process.exit(1)
}

main().catch(err => {
  console.error(JSON.stringify({ error: err.message }))
  process.exit(1)
})
