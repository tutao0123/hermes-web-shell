# 手动配置 Cloudflare

[返回安装指南](getting-started.md)

目标是让自己的 `https://hermes.example.com` 访问运行 Hermes 的电脑上的 `http://127.0.0.1:5174`。本指南使用固定域名的远程管理隧道，首次配置后可重复使用。

Cloudflare 的菜单名称会随版本变化。找不到相同文字时，以 [Cloudflare 官方创建隧道指南](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/)为准，不必寻找某个完全相同的中文按钮。

## 1. 创建隧道

登录 [Cloudflare 控制台](https://dash.cloudflare.com/)，选择自己的账号，找到 Tunnel / Tunnels（隧道）页面并创建 cloudflared 隧道。名称可以填 `hermes-phone`。

已有专用于这台电脑的隧道可以复用。若从旧服务器切换过来，请停止旧机器的连接器，避免同一隧道的请求仍被分配到旧机器。切换隧道不会迁移 Hermes 会话。

## 2. 安装并连接 cloudflared

在隧道的连接器设置中，按官方提供的 Windows 安装步骤安装 cloudflared。连接器需要运行在 **Hermes 所在的电脑** 上。

如果你选择官方的系统服务安装方式，可由该服务持续运行；本项目无需重复启动它。等待控制台显示连接器在线。

想让本项目启动器运行连接器时，需要保存 **该隧道的运行 token**。它不是账号设置里的通用 API token；token 通常出现在隧道提供的连接器启动命令中。只复制 token 字符串，不要连同整条命令、`--token` 或引号一起保存。

在 PowerShell 中打开专用文件：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.hermes-web-shell" | Out-Null
notepad "$env:USERPROFILE\.hermes-web-shell\tunnel-token.txt"
```

粘贴 token、保存。不要把它放进 README、Issue、聊天截图或 Git 仓库。

当前启动器只自动寻找以下位置的连接器：

```text
C:\Program Files (x86)\cloudflared\cloudflared.exe
```

安装路径不同并不代表安装失败，但你需要自行运行连接器，或调整启动脚本中的路径。若电脑上已有其他隧道的 cloudflared 进程，当前启动器不会再启动新进程，请自行确认运行的是这条隧道。

需要手动运行、观察连接状态时，使用实际安装路径执行：

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel run --token-file "$env:USERPROFILE\.hermes-web-shell\tunnel-token.txt"
```

这个命令占用当前终端，关闭终端会停止这个前台连接器。不要与已运行的同一连接器重复启动。

关于 token 的获取和轮换，参见 [Cloudflare Tunnel tokens](https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/)。

![隧道 token 保存位置示意，凭证已隐藏](images/token-storage.svg)

## 3. 添加公开域名路由

在隧道的路由页添加 **Published application（公开应用）** 路由；不同界面也可能显示为 Published application routes 或 Public Hostname。

| 设置 | 示例 |
| --- | --- |
| 子域名 | `hermes` |
| 域名 | `example.com`，选择自己已接入 Cloudflare 的域名 |
| 路径 | 留空，转发整个站点 |
| 服务类型 | `HTTP` |
| 服务地址 | `127.0.0.1:5174` |

若界面将服务类型与地址合并为一个输入框，则填 `http://127.0.0.1:5174`。

手机使用 HTTPS；连接器转发到本机使用 HTTP，这是两段不同的连接。不要把本机服务填写为 HTTPS，也不要误填官方 Dashboard 的 `9119` 端口。

保存时如果提示域名记录冲突，检查是否已有同名 DNS 记录或旧隧道路由，确认用途后再调整。无需在路由器映射 5174 端口。

![Cloudflare 公开域名与 HTTP 本机服务字段示意](images/cloudflare-route.svg)

> 这是字段填写示意，不是 Cloudflare 当前控制台截图；按钮位置可能随版本变化。

## 4. 告诉二维码使用哪个域名

在项目根目录 `.env.local` 中设置：

```dotenv
SHELL_PUBLIC_URL=https://hermes.example.com
VITE_ALLOWED_HOSTS=hermes.example.com
```

两处都换成自己的域名。`SHELL_PUBLIC_URL` 只决定二维码中的地址，**不会替你创建 DNS 或隧道路由**。

重启本项目服务，再生成新的二维码。不要修改 Cloudflare 的 HTTP Host Header 来伪装成本地地址，否则可能影响手机请求的来源校验。

## 5. 验证

1. 本机打开 `http://127.0.0.1:5174`，页面可响应。
2. Cloudflare 控制台显示这台电脑的连接器在线。
3. 手机打开自己的 HTTPS 域名，能看到 Hermes 登录页面。
4. 电脑双击 `连接手机.vbs`，手机扫码后能进入会话界面。

二维码成功生成只表示本机能创建配对凭证，不等于公网隧道已经连通。

如果额外启用了 Cloudflare Access，手机可能先遇到 Cloudflare 自己的认证页面；本项目的扫码登录不会绕过你配置的这层访问策略。

配置后回到[安装指南的扫码步骤](getting-started.md#5-打开二维码窗口)。
