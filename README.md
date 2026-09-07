# Hermes Web Shell

移动端友好的 **本机 Hermes Agent 伴侣 Web 壳**（Vite + React + TypeScript）。

> **注意：** 本项目是社区/个人维护的 companion web UI，**不是**官方 Hermes 插件或官方产品。

通过 Vite 开发服务器中间件 `/api/hermes/*` 读取本机 `~/.hermes/state.db` 会话，并用 `hermes -z` 发送/续聊。无本机 Hermes 时自动回退到 Mock 演示数据。

---

## 功能概览

- **工作区** — 按会话工作目录（cwd）分组
- **任务** — Hermes 会话列表
- **会话** — 真实消息流 + 本机模型续聊
- **电脑交还** — DesktopOverlay（可选 `VITE_DESKTOP_URL` 指向 noVNC 等）
- **主题 / 语言** — 亮暗主题与中/英切换（PasswordGate 与工作区页可见）

## 环境要求

- 本机已安装并可运行 [Hermes Agent](https://github.com/NousResearch/hermes-agent)（可选；无则进 Mock）
- [Bun](https://bun.sh/) 或 Node.js 18+
- 默认读取 `~/.hermes`；可用环境变量覆盖：
  - `HERMES_HOME` — Hermes 数据目录（默认 `~/.hermes`）
  - `HERMES_BIN` — `hermes` 可执行文件路径（默认在 `PATH` 中查找 `hermes`）

## 快速开始

```bash
git clone https://github.com/tutao0123/hermes-web-shell.git
cd hermes-web-shell
bun install
bun run dev
```

Open http://127.0.0.1:5174

### 演示密码

入口有简易密码门禁，默认密码：`demo`（存于 `sessionStorage`，仅演示用）。

### 主题与语言

PasswordGate 与工作区页右上角可切换：

- 语言：中文 / EN
- 主题：亮 / 暗

偏好保存在 `localStorage`。

## API 路由

开发服务器中间件提供：

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/hermes/status` | Hermes / 模型状态 |
| `GET` | `/api/hermes/sessions` | 会话列表 |
| `GET` | `/api/hermes/sessions/:id` | 会话消息块 |
| `POST` | `/api/hermes/chat` | body: `{ sessionId?, message }` |

## Cloudflare Tunnel（可选）

若需从公网/手机访问本机 dev server，可用 Cloudflare Tunnel 等把流量转到 `127.0.0.1:5174`。

Vite `allowedHosts` 默认放行所有 host（适合临时隧道）。如需收紧：

```bash
# .env.local (do not commit)
VITE_ALLOWED_HOSTS=your-tunnel.example.com
# or true
VITE_ALLOWED_HOSTS=true
```

示例（请换成你自己的 hostname）：

```bash
cloudflared tunnel --url http://127.0.0.1:5174
```

**请勿**将个人 `cloudflared` 证书或凭证提交到仓库。

## 安全说明

- **不要**把模型服务凭证、Hermes 凭证等写入仓库或提交 `.env*`。
- 密码门禁（`demo`）**仅用于演示**，不是生产级鉴权；公网暴露时请自行加固（反向代理鉴权、VPN、关闭公网等）。
- 本壳可调用本机 `hermes` 并读取本机会话库，请只在可信网络使用。

## 许可

[MIT](./LICENSE) © 2026 Tao

---

## English (short)

**Hermes Web Shell** is a mobile-friendly companion web UI for a **locally installed** Hermes Agent. It is **not** an official Hermes plugin.

```bash
bun install && bun run dev   # http://127.0.0.1:5174
```

Demo gate password: `demo`. Theme/locale toggles on the gate and workspaces pages. Optional tunnel: point Cloudflare Tunnel (or similar) at `127.0.0.1:5174`; set `VITE_ALLOWED_HOSTS` if you need a host allowlist. Do not commit credentials or personal tunnel certs. License: MIT.
