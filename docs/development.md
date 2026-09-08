# 开发与配置

[返回首页](../README.md)

## 本地开发

以 Node.js 24 和 npm 为文档默认环境：

```powershell
npm ci
npm run dev
```

React 页面由 Vite 提供，默认 `127.0.0.1:5174`。`server/access.ts` 在页面及 API 之前执行认证，`server/hermesApiPlugin.ts` 读取 Hermes 数据库并调用 CLI。

聊天 API 目前只在 Vite `configureServer` 中注册。`npm run build` 用于构建检查，`npm run preview` 或静态托管不能替代完整 Hermes 后端。

## 配置项

| 配置 | 用途 |
| --- | --- |
| `SHELL_PUBLIC_URL` | 配对二维码中的 HTTPS 公网地址，例：`https://hermes.example.com` |
| `SHELL_ACCESS_PASSWORD` | 可选网页登录密码，至少 12 个字符；不设则生成本地密码文件 |
| `VITE_ALLOWED_HOSTS` | 允许访问的域名，多个用逗号分隔；建议填写实际域名 |
| `VITE_DESKTOP_URL` | 可选远程桌面页面；需自行部署对应服务 |
| `HERMES_HOME` | Hermes 数据目录，默认当前用户的 `.hermes` |
| `HERMES_BIN` | Hermes CLI 可执行程序，默认 `hermes` |

前四项放在项目 `.env.local`。当前 Hermes API 模块在加载时读取 `process.env`，因此 `HERMES_HOME` 和 `HERMES_BIN` 请在启动进程的环境中设置，不要只写入 `.env.local`：

```powershell
$env:HERMES_HOME = 'D:\my-hermes-data'
$env:HERMES_BIN = 'D:\tools\hermes.exe'
npm run dev
```

示例路径必须替换为真实目录、真实程序；环境变量只影响当前 PowerShell 启动的子进程。新窗口启动器不会继承另一个终端临时设置的变量。

## 认证与本地状态

`~/.hermes-web-shell` 保存访问密码、本地配对凭证和 `sessions.json`。会话凭证以摘要持久化，浏览器使用 HttpOnly、SameSite=Strict cookie；HTTPS 请求设置 Secure。

二维码凭证在内存中保存 5 分钟且只能兑换一次，链接使用 fragment，浏览器兑换前清理地址栏。刷新同一配对发起端的二维码会使其旧码失效，服务重启会清空待兑换码。

Windows 启动器通过本地文件凭证请求配对接口；服务还检查回环地址、Host、Origin 和代理标记。Cloudflare 本身也从回环连接后端，因此不能仅凭回环 IP 给予权限。本地配对凭证不授权读取聊天 API。所有已登录网页会话都具有设备管理权限。

## 验证改动

```powershell
npm run build
npm run lint
node --experimental-strip-types --test scripts/test-access.mjs
python -m unittest discover -s scripts -p test_decode_screenshots.py
```

最后一项仅与截图恢复脚本有关，需要 Python。认证测试覆盖登录、二维码复用拒绝、会话跨重启、撤销、跨来源请求拒绝和本地配对权限边界。它不替代真实手机相机、浏览器与公网网络的端到端检查。

## 贡献

提交改动前说明解决的问题、实际验证方式和已知限制。不要提交 `.env.local`、用户状态目录、二维码或任何凭证。截图应使用演示会话，说明是否为当前版本；图片恢复流程见[截图说明](screenshots/README.md)。
