# 安装与扫码连接指南

[返回首页](../README.md) · [Cloudflare 配置](cloudflare.md) · [常见问题](troubleshooting.md)

完成后，你的日常操作就是：**电脑打开「连接手机」→ 手机扫码 → 继续 Hermes 会话**。安装和配置只需做一次，除非换电脑、换域名或重装环境。

![首次配置与日常扫码流程](images/connection-flow.svg)

## 1. 准备电脑

本指南以 Windows PowerShell 为例。准备：

- 已安装并能正常聊天的 [Hermes Agent](https://github.com/NousResearch/hermes-agent)。先解决 Hermes 自身的模型和网络配置，再安装本应用。
- [Node.js](https://nodejs.org/) 24 和 [Git](https://git-scm.com/downloads)。安装后重新打开终端。
- Cloudflare 账号，以及已接入该账号的域名。示例使用 `hermes.example.com`，请全部换成你自己的域名。

检查终端能够找到程序：

```powershell
node --version
npm --version
git --version
hermes --help
```

本项目没有要求安装官方 Hermes Desktop，也不需要额外配置 Hermes Gateway 才能配对。它读取本机数据并调用 Hermes CLI；Hermes 本身仍需正确安装。

## 2. 下载并安装依赖

在你想保存项目的位置打开 PowerShell：

```powershell
git clone https://github.com/tutao0123/hermes-web-shell.git
cd hermes-web-shell
npm ci
Copy-Item .env.example .env.local
notepad .env.local
```

已有 `.env.local` 时不要再次覆盖它。保留文件中其他需要的设置，添加下面两行：

```dotenv
SHELL_PUBLIC_URL=https://hermes.example.com
VITE_ALLOWED_HOSTS=hermes.example.com
```

这是项目配置文件，不是 PowerShell 命令。域名必须替换成你自己的地址，使用 HTTPS，不加 `/connect` 或其他路径。

## 3. 先运行一次本机服务

```powershell
npm run dev
```

服务默认监听 `http://127.0.0.1:5174`。先保留这个终端，用它完成首次初始化；随后启动器才能复用生成的配置目录和凭证。

可以在电脑浏览器打开该地址检查页面。如果看到密码框，说明网页已能响应，**不用登录也可以继续配置手机连接**。需要电脑端聊天时，再使用下一节的访问密码。

首次运行会在用户目录下创建 `.hermes-web-shell`，Windows 通常是：

```text
C:\Users\你的用户名\.hermes-web-shell\
```

## 4. 配置 Cloudflare

按照[手动配置 Cloudflare](cloudflare.md)完成以下三件事：

1. 创建隧道，并在这台运行 Hermes 的电脑上安装、运行连接器。
2. 将自己的域名指向本机 `http://127.0.0.1:5174`。
3. 如果希望启动器帮你启动隧道，将隧道 token 保存到指定的本地文件。

检查：手机浏览器打开 `https://hermes.example.com`，应能看到 Hermes 登录页面。这一步只用来确认域名通了，**无需在手机手动输入密码**。

## 5. 打开二维码窗口

回到项目文件夹，双击 **`连接手机.vbs`**。窗口应直接显示二维码。

- 扫描二维码，在手机浏览器中打开链接，即可登录。
- 二维码 5 分钟有效，仅能使用一次；失效后点击「刷新二维码」。
- 手机登录保留 30 天。清除网站数据、使用不同浏览器或被取消连接后，需要重新配对。
- 可收藏自己的域名；已登录时不必每天扫码。

如果双击没有反应，可在项目目录的 PowerShell 中运行以下命令查看错误：

```powershell
powershell.exe -NoProfile -STA -File .\scripts\connect-phone.ps1
```

如果系统策略限制脚本运行，请按自己设备或组织的允许方式处理；不要通过关闭系统防护解决。

![本机二维码窗口操作示意，二维码已隐藏](images/phone-pairing.svg)

> 请扫描自己电脑上生成的真实二维码。文档配图不可扫码。

## 6. 下次怎么使用

电脑重启后，双击 `连接手机.vbs`：

- 启动器会尝试启动尚未运行的本机 Web 服务。
- 如果检测到默认位置的 cloudflared 和保存的 token，且没有 cloudflared 进程，会尝试启动隧道。
- 如果 cloudflared 安装在其他位置或由系统服务管理，请自行保证它在运行。

关闭二维码窗口不等于停止服务。电脑睡眠、关机或网络断开时，手机将无法继续访问。当前版本没有自动开机运行功能。

## 管理手机连接

点击二维码窗口里的「已连接设备」，选中设备并取消连接。设备下次请求时会被拒绝，需要重新扫码。

设备名称来自浏览器类别，同类手机可能重名；可以结合连接时间判断。已登录的网页用户同样能生成二维码和管理设备，这不是分权限的多用户系统。

## 不使用 Windows 二维码窗口

保持本机 Web 服务和隧道运行，浏览器打开 `https://hermes.example.com/connect`，使用访问密码登录，再进入「连接手机」生成二维码。首次网页登录后会返回首页。

默认访问密码保存在 `~/.hermes-web-shell/access-password.txt`。Windows 可用记事本打开：

```powershell
notepad "$env:USERPROFILE\.hermes-web-shell\access-password.txt"
```

它与 Cloudflare tunnel token 是两种不同凭证。macOS / Linux 可使用这一网页入口，但 CLI 兼容性需按实际 Hermes 安装环境验证。

## 更新

先关闭二维码窗口，停止本项目的 Web 服务，再在项目目录执行：

```powershell
git pull --ff-only
npm ci
```

重新双击启动器。若 Git 提示本地有改动，先保存或提交自己的修改，不要覆盖。通常无需重配域名；已登录手机的会话文件保存在项目之外，更新代码不会主动删除它。更新后旧的未使用二维码需要重新生成。
