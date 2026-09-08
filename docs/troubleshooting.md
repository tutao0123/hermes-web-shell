# Troubleshooting

[Home](../README.md) · [Setup](getting-started.md)

Check the local page first, then the public domain, then Hermes chat. These isolate the web service, tunnel, and model/CLI layers.

| Symptom | Check first |
| --- | --- |
| Local page does not open | Run `npm run dev`; check dependencies and whether another process owns port 5174 |
| Local works, domain fails | Connector status and routing to `http://127.0.0.1:5174` |
| Cloudflare error page or 502 | Connector logs and the local service before changing model settings |
| Only sending messages returns 502 | Run Hermes directly on this computer; check CLI, model provider, and network |
| Demo data or missing conversations | Correct Hermes user directory and `state.db`; demo content does not prove a real connection |
| QR expired or already used | Refresh; codes last five minutes, work once, and are cleared by service restart |
| QR generation fails | Complete the first `npm run dev` initialization; check HTTPS `SHELL_PUBLIC_URL` |
| Host rejected | Set `VITE_ALLOWED_HOSTS` to the actual hostname without protocol/path, then restart |
| Request origin mismatch | Reopen the correct domain and check proxy Host/HTTPS header handling |
| Sign-in lost | Session expiry, revocation, cleared site data, or a different browser; pair again |

## Which credential is which?

All files below are in your user directory's `.hermes-web-shell` folder.

| File | Purpose | Used by |
| --- | --- | --- |
| `access-password.txt` | Manual browser sign-in | Browser users |
| `tunnel-token.txt` | Join the configured tunnel | cloudflared |
| `local-pairing-key.txt` | Local pairing management | Native launcher, automatically |

Phone pairing does not require typing any of them. The QR code is itself a temporary access credential; show it only to intended devices.

## Why do I need to sign in again?

Use the same browser. Camera links, in-app browsers, Safari, and Chrome may have separate site data. Private browsing may discard sessions when closed. Sessions last 30 days.

Bookmark the normal domain, not a pairing link. If the page already opens while signed in, there is no need to scan again.

## The launcher does not open

Run from the project folder:

```powershell
powershell.exe -NoProfile -STA -File .\scripts\connect-phone.ps1
```

Check Node.js on PATH, `npm ci`, and first-run initialization. If Windows Script Host is disabled, use this PowerShell entry point. Follow organizational rules for script execution.

## Closing the window does not stop access

The pairing window and background service are separate. Use Ctrl+C in the corresponding foreground terminal, or stop the identified service/process that belongs to this installation. Do not terminate all Node or cloudflared processes.

## Do I need a proxy?

That depends on your network and model provider. Browser proxy settings are not automatically shared by Node, Hermes, or cloudflared. Identify the failing component first, then configure that program. The tunnel's service address should still be `127.0.0.1:5174`, not a proxy port.

## Switching computers

The new computer needs its own working Hermes environment and conversation data. Stop the old connector before moving the tunnel. Routing changes do not transfer files or conversations; new pairing codes authorize the new computer.

## Reporting an issue

Include your OS, Node.js version, failing step, whether local and public pages work, the error text, and recent domain/Hermes changes in [GitHub Issues](https://github.com/tutao0123/hermes-web-shell/issues).

Background web logs are usually `~/.hermes-web-shell/web.log` and `web-error.log`; foreground logs appear in the terminal. Tunnel logs depend on how cloudflared runs. Remove tokens, passwords, QR codes, model keys, and private conversation content before sharing.
