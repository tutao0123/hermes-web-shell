# Hermes Web Shell

**Use your computer's Hermes Agent from your phone. Configure Cloudflare once, open the pairing window, and scan to connect.**

A community-maintained companion web app for a locally installed Hermes Agent. Your computer runs Hermes; your phone lets you browse conversations and continue tasks. This is an independent application, not an official Hermes product, plugin, or skill.

## Features

- Browse local conversations grouped by workspace and continue chatting.
- Open a native Windows pairing window without a desktop browser login.
- Pair using a single-use QR code, stay signed in for 30 days, and revoke devices.
- Use a mobile browser with light/dark themes and Chinese/English preferences.

![Computer, tunnel, and phone connection](docs/images/connection-flow.svg)

## Start here

| What you need | Guide |
| --- | --- |
| First-time installation | [Installation and phone pairing](docs/getting-started.md) |
| A public domain | [Manual Cloudflare setup](docs/cloudflare.md) |
| Help with errors | [Troubleshooting](docs/troubleshooting.md) |
| Configuration and contributing | [Development](docs/development.md) |

### First-time setup

You need a working Hermes installation, Git, Node.js 24, and a domain connected to Cloudflare. The native pairing window currently supports Windows only. Other systems can use browser pairing, but full platform compatibility has not been verified.

```powershell
git clone https://github.com/tutao0123/hermes-web-shell.git
cd hermes-web-shell
npm ci
npm run dev
```

Then follow the [setup guide](docs/getting-started.md). **These commands alone do not make the app remotely accessible.**

### Everyday use

1. Double-click **`连接手机.vbs`** ("Connect phone") in the project folder.
2. Scan the window's code with your phone camera and open it in a browser.
3. Use Hermes. While signed in, open your domain directly next time.

You can create a desktop shortcut yourself; the repository does not automatically create one. The native window currently uses Chinese labels, with English equivalents explained in the guides.

Codes expire after five minutes and work once. Keep the computer awake and online, with the web service and tunnel running. Closing the window does not stop background services.

## Current scope

- Cloudflare setup is manual. There is no setup wizard, universal installer, or automatic startup at boot.
- The backend runs inside Vite. Uploading the static build alone does not provide a working Hermes backend.
- Real conversations require the local Hermes database and CLI. The interface may fall back to demo data.
- Connecting another computer does not migrate conversations from an old server.
- QR codes contain temporary access credentials, not your Cloudflare token or login password. Show them only to devices you intend to authorize.

## Preview

Historical mobile screenshots; follow the setup guide for current sign-in and pairing behavior.

<p>
  <img src="docs/screenshots/phone-03-workspaces.png" alt="Workspace list on a phone" width="250">
  <img src="docs/screenshots/phone-02-greetings.png" alt="Hermes conversation on a phone" width="250">
</p>

## License

[MIT](LICENSE) © 2026 Tao
