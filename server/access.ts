import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import QRCode from 'qrcode'

const hash = (s: string) => createHash('sha256').update(s).digest('hex')
const equal = (a: string, b: string) => timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)))

export function getPrimaryLocalIp(): string {
  const nets = networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address
      }
    }
  }
  return '127.0.0.1'
}

export function isPrivateOrLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  return false
}

export function checkPassword(header: string | undefined, password: string): boolean {
  if (!header?.startsWith('Basic ')) return false
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8')
  const separator = decoded.indexOf(':')
  return separator >= 0 && equal(decoded.slice(separator + 1), password)
}

export interface AccessPluginOptions {
  configuredPassword?: string
  publicUrl?: string
  sessionDays?: number
  singleDevice?: boolean
  storageDirectory?: string
}

type Session = { id: string; expires: number; name: string; created: number }

function buildPage(sessionDays: number): string {
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>连接 Hermes</title><style>body{font:16px system-ui;background:#f6f6f8;color:#171717;margin:0;padding:24px}main{max-width:420px;margin:8vh auto;background:white;padding:28px;border-radius:22px}h1{font-size:25px}input,button{box-sizing:border-box;width:100%;padding:14px;margin:8px 0;border-radius:12px;border:1px solid #ddd;font:inherit}button{background:#181818;color:white;cursor:pointer}p{line-height:1.6;color:#666}a{color:inherit}#qr svg{width:100%;height:auto}li{margin:16px 0;overflow-wrap:anywhere}#status{color:#9b311f}button:disabled{opacity:.5}#pair-link{word-break:break-all;color:#0066cc;text-decoration:underline;margin:12px 0;display:block}</style><main><h1>✦ 连接 Hermes</h1><p id="intro">输入电脑的访问密码，或用电脑生成的二维码连接。</p><form id="login"><input id="password" type="password" autocomplete="current-password" placeholder="访问密码" required><button>登录并记住此设备</button></form><section id="manage" hidden><p>手机扫码或打开链接即可登录。二维码 5 分钟有效，仅能使用一次；登录保留 ${sessionDays} 天。</p><button id="generate">生成连接二维码</button><div id="qr"></div><div id="pair-container"></div><p id="expiry"></p><h2>已连接设备</h2><ul id="devices"></ul><button id="logout">退出此设备</button><p><a href="/">返回 Hermes →</a></p></section><p id="status" role="status"></p></main><script type="module" src="/auth/client.js"></script></html>`
}

const client = `const $=id=>document.getElementById(id);const status=$('status');async function api(path,data){const r=await fetch('/auth/'+path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});const result=await r.json();if(!r.ok)throw Error(result.error||'连接失败，请重试');return result}async function devices(){const d=await api('devices');$('devices').replaceChildren();for(const s of d.sessions){const li=document.createElement('li');li.textContent=s.name+(s.current?'（当前设备）':'')+' · '+new Date(s.created).toLocaleDateString();const b=document.createElement('button');b.textContent='取消连接';b.onclick=()=>run(async()=>{await api('revoke',{id:s.id});if(s.current)location.reload();else await devices()});li.append(b);$('devices').append(li)}}async function run(fn){status.textContent='';try{await fn()}catch(e){status.textContent=e.message;if($("manage").hidden)$("login").hidden=false}}$('login').onsubmit=e=>{e.preventDefault();run(async()=>{await api('login',{password:$('password').value});location.replace('/')})};let timer;$('generate').onclick=()=>run(async()=>{const b=$('generate');b.disabled=true;try{const d=await api('pair',{});$('qr').innerHTML=d.svg;if(d.link){const container=$('pair-container');container.replaceChildren();const a=document.createElement('a');a.id='pair-link';a.href=d.link;a.target='_blank';a.textContent=(d.isLan?'[局域网直连链接] ':'[外网连接链接] ')+d.link;container.append(a)}clearInterval(timer);timer=setInterval(()=>{const left=Math.max(0,Math.ceil((d.expires-Date.now())/1000));$('expiry').textContent=left?'剩余 '+left+' 秒':'二维码已过期，请重新生成';if(!left){$('qr').replaceChildren();if($('pair-container'))$('pair-container').replaceChildren();clearInterval(timer)}},1000)}finally{b.disabled=false}});$('logout').onclick=()=>run(async()=>{await api('logout',{});location.replace('/')});run(async()=>{const token=new URLSearchParams(location.hash.slice(1)).get('pair');if(token){history.replaceState(null,'','/connect');$('login').hidden=true;status.textContent='正在连接…';await api('redeem',{token});location.replace('/');return}const d=await api('status');if(d.authenticated){$('login').hidden=true;$('manage').hidden=false;$('intro').textContent='在这里连接手机或管理已登录设备。';await devices()}});`

export function accessPlugin(
  optionsOrPassword?: string | AccessPluginOptions,
  legacyPublicUrl?: string,
  legacyStorageDirectory?: string,
): Plugin {
  const opts: AccessPluginOptions = typeof optionsOrPassword === 'object' && optionsOrPassword !== null ? optionsOrPassword : {}
  const configuredPassword = typeof optionsOrPassword === 'string' ? optionsOrPassword : opts.configuredPassword
  const publicUrl = typeof optionsOrPassword === 'string' ? legacyPublicUrl : (opts.publicUrl ?? legacyPublicUrl)
  const storageDirectory = (typeof optionsOrPassword === 'string' ? legacyStorageDirectory : (opts.storageDirectory ?? legacyStorageDirectory)) || join(homedir(), '.hermes-web-shell')
  const sessionDays = Math.max(1, Math.min(90, Number(process.env.SHELL_SESSION_DAYS || opts.sessionDays || 7)))
  const singleDevice = process.env.SHELL_SINGLE_DEVICE === 'true' || opts.singleDevice === true
  const page = buildPage(sessionDays)

  mkdirSync(storageDirectory, { recursive: true, mode: 0o700 })
  const passwordFile = join(storageDirectory, 'access-password.txt')
  let password = configuredPassword
  if (!password) {
    try { password = readFileSync(passwordFile, 'utf8').trim() } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
      password = randomBytes(18).toString('base64url')
      writeFileSync(passwordFile, password + '\n', { flag: 'wx', mode: 0o600 })
    }
  }
  if (password.length < 12) throw Error('Access password must contain at least 12 characters')
  const localKeyFile = join(storageDirectory, 'local-pairing-key.txt')
  let localKey: string
  try { localKey = readFileSync(localKeyFile, 'utf8').trim() } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    localKey = randomBytes(32).toString('base64url')
    writeFileSync(localKeyFile, localKey, { flag: 'wx', mode: 0o600 })
  }
  const secret = password
  const file = join(storageDirectory, 'sessions.json')
  let sessions: Record<string, Session> = {}
  try { sessions = JSON.parse(readFileSync(file, 'utf8')) } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
  const save = () => { writeFileSync(file + '.tmp', JSON.stringify(sessions), { mode: 0o600 }); renameSync(file + '.tmp', file) }
  const pairs = new Map<string, { expires: number; owner: string }>()
  const attempts = new Map<string, { count: number; until: number }>()
  const middleware = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const path = (req.url || '/').split('?')[0]
    const secure = req.headers['x-forwarded-proto'] === 'https' || !!(req.socket as { encrypted?: boolean }).encrypted
    const origin = (secure ? 'https://' : 'http://') + req.headers.host
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Referrer-Policy', 'no-referrer')
    const json = (code: number, value: unknown) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)) }
    const cookie = (value: string, age: number) => res.setHeader('Set-Cookie', 'hermes_session=' + value + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + (secure ? '; Secure' : ''))
    const raw = /(?:^|;\s*)hermes_session=([^;]*)/.exec(req.headers.cookie || '')?.[1] || ''
    const key = hash(raw)
    const session = sessions[key]?.expires > Date.now() ? sessions[key] : undefined
    // Only the native launcher knows this local capability. Tunnel traffic is
    // also loopback, so loopback alone must never grant access.
    const localManager = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')
      && /^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host || '')
      && !req.headers.origin && !req.headers['cf-ray'] && !req.headers['x-forwarded-for']
      && typeof req.headers['x-hermes-local-key'] === 'string'
      && equal(req.headers['x-hermes-local-key'], localKey)
    const authenticated = !!session
    const canManage = authenticated || localManager
    const issue = () => {
      const token = randomBytes(32).toString('base64url')
      const ua = req.headers['user-agent'] || ''
      if (singleDevice) {
        for (const k of Object.keys(sessions)) delete sessions[k]
      } else {
        for (const [k, s] of Object.entries(sessions)) if (s.expires <= Date.now()) delete sessions[k]
      }
      const maxAgeSeconds = sessionDays * 86400
      sessions[hash(token)] = {
        id: randomBytes(12).toString('hex'),
        expires: Date.now() + maxAgeSeconds * 1000,
        created: Date.now(),
        name: /iPhone|iPad/.test(ua) ? 'iPhone / iPad' : /Android/.test(ua) ? 'Android' : '电脑浏览器'
      }
      save()
      cookie(token, maxAgeSeconds)
    }
    try {
      if (req.method === 'GET' && path === '/auth/client.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(client); return }
      if (req.method === 'GET' && (path === '/connect' || (!authenticated && path === '/'))) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        res.end(page); return
      }
      if (req.method === 'GET' && path === '/auth/status') { json(200, { authenticated }); return }
      if (req.method === 'GET' && path === '/auth/devices' && canManage) { json(200, { sessions: Object.values(sessions).filter(s => s.expires > Date.now()).map(s => ({ ...s, current: s.id === session?.id })) }); return }
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method || '')) {
        if (!localManager && req.headers.origin !== origin) { json(403, { error: '请求来源不匹配，请刷新页面' }); return }
      }
      if (req.method === 'POST' && path.startsWith('/auth/')) {
        let body = ''
        for await (const chunk of req) { body += chunk; if (body.length > 4096) { json(413, { error: '请求过大' }); return } }
        const data = JSON.parse(body || '{}')
        if (path === '/auth/login' || path === '/auth/redeem') {
          const ip = String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress)
          for (const [k, v] of attempts) if (v.until < Date.now()) attempts.delete(k)
          const rate = attempts.get(ip) || { count: 0, until: Date.now() + 60000 }
          if (++rate.count > 10) { json(429, { error: '尝试过于频繁，请一分钟后重试' }); return }
          attempts.set(ip, rate)
          if (path === '/auth/login') {
            if (typeof data.password !== 'string' || !equal(data.password, secret)) { json(401, { error: '密码不正确' }); return }
          } else {
            const pairKey = hash(String(data.token || ''))
            const pair = pairs.get(pairKey)
            if (!pair || pair.expires <= Date.now()) { json(401, { error: '二维码已失效或已使用，请在电脑上重新生成' }); return }
            pairs.delete(pairKey)
          }
          issue(); json(200, { ok: true }); return
        }
        if (!canManage) { json(401, { error: '请先登录' }); return }
        if (path === '/auth/pair') {
          const port = req.socket.localPort || 5174
          const lanIp = getPrimaryLocalIp()
          const lanLink = `http://${lanIp}:${port}`
          let publicOrigin: string | undefined
          const candidateUrl = (typeof data.publicUrl === 'string' && data.publicUrl.trim()) || publicUrl?.trim()
          if (candidateUrl) {
            try {
              const parsed = new URL(candidateUrl)
              if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
                publicOrigin = parsed.origin
              }
            } catch {}
          }

          const preferLan = data.mode === 'lan' || !publicOrigin
          const targetOrigin = preferLan ? lanLink : publicOrigin
          const isLocal = preferLan

          for (const [k, p] of pairs) if (p.expires < Date.now() || p.owner === key) pairs.delete(k)
          const token = randomBytes(32).toString('base64url'), expires = Date.now() + 300000
          pairs.set(hash(token), { expires, owner: key })

          const link = `${targetOrigin}/connect#pair=${token}`
          const fullLanLink = `${lanLink}/connect#pair=${token}`
          const fullPublicLink = publicOrigin ? `${publicOrigin}/connect#pair=${token}` : undefined

          json(200, {
            link,
            lanLink: fullLanLink,
            publicLink: fullPublicLink,
            isLan: isLocal,
            svg: await QRCode.toString(link, { type: 'svg', margin: 2 }),
            ...(localManager ? { png: await QRCode.toDataURL(link, { width: 320, margin: 2 }) } : {}),
            expires
          })
          return
        }
        if (path === '/auth/logout') { delete sessions[key]; save(); cookie('', 0); json(200, { ok: true }); return }
        if (path === '/auth/revoke') {
          for (const [k, s] of Object.entries(sessions)) if (s.id === data.id) { delete sessions[k]; for (const [pk, p] of pairs) if (p.owner === k) pairs.delete(pk) }
          save(); json(200, { ok: true }); return
        }
        json(404, { error: '接口不存在' }); return
      }
      if (authenticated) { next(); return }
      json(401, { error: '请先登录', loginUrl: '/connect' })
    } catch { json(500, { error: '连接处理失败，请重试' }) }
  }
  return { name: 'shell-access', configureServer(server) { server.middlewares.use(middleware) }, configurePreviewServer(server) { server.middlewares.use(middleware) } }
}


