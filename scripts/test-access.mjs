import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { accessPlugin } from '../server/access.ts'

test('password login, QR one-use, persistent sessions, revocation and CSRF', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-auth-'))
  let middleware
  function init() { accessPlugin('test-password-long', 'https://hermes.example.com', dir).configureServer({ middlewares: { use(fn) { middleware = fn } } }) }
  init()
  const server = createServer((req, res) => middleware(req, res, () => res.end('protected')))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = 'http://127.0.0.1:' + server.address().port
  const call = (path, data, cookie = '', requestOrigin = origin) => fetch(origin + path, { method: data ? 'POST' : 'GET', headers: { cookie, ...(data ? { origin: requestOrigin, 'content-type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined })
  try {
    assert.equal((await call('/api/private')).status, 401)
    assert.match(await (await call('/')).text(), /连接 Hermes/)
    const localKey = readFileSync(join(dir, 'local-pairing-key.txt'), 'utf8')
    const native = (path, headers = {}) => fetch(origin + path, { method: 'POST', headers: { 'x-hermes-local-key': localKey, 'content-type': 'application/json', ...headers }, body: '{}' })
    assert.equal((await native('/auth/pair', { 'x-hermes-local-key': 'wrong' })).status, 403)
    assert.equal((await native('/auth/pair', { 'cf-ray': 'tunnel' })).status, 403)
    assert.equal((await native('/auth/pair', { origin: 'https://evil.example' })).status, 403)
    const localPair = await native('/auth/pair')
    assert.equal(localPair.status, 200)
    assert.match((await localPair.json()).png, /^data:image\/png;base64,/)
    assert.equal((await fetch(origin + '/api/private', { headers: { 'x-hermes-local-key': localKey } })).status, 401)

    assert.equal((await call('/auth/pair', {})).status, 401)
    assert.equal((await call('/auth/login', { password: 'wrong' })).status, 401)
    const login = await call('/auth/login', { password: 'test-password-long' })
    const cookie = login.headers.get('set-cookie').split(';')[0]
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/)
    assert.equal(await (await call('/api/private', null, cookie)).text(), 'protected')
    assert.equal((await call('/auth/pair', {}, cookie, 'https://evil.example')).status, 403)
    const qr = await (await call('/auth/pair', {}, cookie)).json()
    assert.match(qr.svg, /<svg/)
    // Capture QR payload through the encoder, without exposing real credentials.
    const QRCode = (await import('qrcode')).default
    const original = QRCode.toString
    let payload
    QRCode.toString = async (text) => { payload = text; return '<svg/>' }
    await call('/auth/pair', {}, cookie)
    QRCode.toString = original
    const token = new URLSearchParams(new URL(payload).hash.slice(1)).get('pair')
    assert.equal(new URL(payload).origin, 'https://hermes.example.com')
    const redeem = await call('/auth/redeem', { token })
    assert.equal(redeem.status, 200)
    const phone = redeem.headers.get('set-cookie').split(';')[0]
    assert.equal((await call('/auth/redeem', { token })).status, 401)
    init()
    assert.equal(await (await call('/api/private', null, phone)).text(), 'protected')
    const devices = await (await call('/auth/devices', null, phone)).json()
    const id = devices.sessions.find(s => s.current).id
    assert.equal((await call('/auth/revoke', { id }, cookie)).status, 200)
    assert.equal((await call('/api/private', null, phone)).status, 401)
    await call('/auth/logout', {}, cookie)
    assert.equal((await call('/api/private', null, cookie)).status, 401)
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }) }
})

test('LAN direct pairing without publicUrl and singleDevice exclusive mode', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hermes-auth-lan-'))
  let middleware
  accessPlugin({ configuredPassword: 'test-password-long', singleDevice: true, sessionDays: 3, storageDirectory: dir }).configureServer({ middlewares: { use(fn) { middleware = fn } } })
  const server = createServer((req, res) => middleware(req, res, () => res.end('protected')))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = 'http://127.0.0.1:' + server.address().port
  const call = (path, data, cookie = '') => fetch(origin + path, { method: data ? 'POST' : 'GET', headers: { cookie, ...(data ? { origin, 'content-type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined })
  try {
    const localKey = readFileSync(join(dir, 'local-pairing-key.txt'), 'utf8')
    const pairResp = await fetch(origin + '/auth/pair', { method: 'POST', headers: { 'x-hermes-local-key': localKey, 'content-type': 'application/json' }, body: '{}' })
    assert.equal(pairResp.status, 200)
    const pairData = await pairResp.json()
    assert.equal(pairData.isLan, true)
    assert.match(pairData.link, /^http:\/\//)
    assert.match(pairData.link, /#pair=/)

    // First device redeems
    const token1 = new URLSearchParams(new URL(pairData.link).hash.slice(1)).get('pair')
    const redeem1 = await call('/auth/redeem', { token: token1 })
    assert.equal(redeem1.status, 200)
    const phoneCookie1 = redeem1.headers.get('set-cookie').split(';')[0]
    assert.equal(await (await call('/api/private', null, phoneCookie1)).text(), 'protected')

    // Second device pairs
    const pairResp2 = await fetch(origin + '/auth/pair', { method: 'POST', headers: { 'x-hermes-local-key': localKey, 'content-type': 'application/json' }, body: '{}' })
    const pairData2 = await pairResp2.json()
    const token2 = new URLSearchParams(new URL(pairData2.link).hash.slice(1)).get('pair')
    const redeem2 = await call('/auth/redeem', { token: token2 })
    assert.equal(redeem2.status, 200)
    const phoneCookie2 = redeem2.headers.get('set-cookie').split(';')[0]
    assert.equal(await (await call('/api/private', null, phoneCookie2)).text(), 'protected')

    // Since singleDevice=true, the first phone must have been invalidated
    assert.equal((await call('/api/private', null, phoneCookie1)).status, 401)
  } finally { await new Promise(resolve => server.close(resolve)); rmSync(dir, { recursive: true, force: true }) }
})
