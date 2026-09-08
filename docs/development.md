# Development and configuration

[Home](../README.md)

## Run locally

The documented runtime is Node.js 24 with npm:

```powershell
npm ci
npm run dev
```

Vite serves React at `127.0.0.1:5174`. Authentication in `server/access.ts` runs before pages and APIs. `server/hermesApiPlugin.ts` reads the database and calls the CLI.

The chat backend is registered only in Vite's `configureServer`. A static build or `npm run preview` does not replace the complete backend.

## Settings

| Variable | Purpose |
| --- | --- |
| `SHELL_PUBLIC_URL` | Public HTTPS origin for QR codes |
| `SHELL_ACCESS_PASSWORD` | Optional browser password, at least 12 characters; otherwise generated locally |
| `VITE_ALLOWED_HOSTS` | Allowed hostnames, comma-separated; use your actual domain |
| `VITE_DESKTOP_URL` | Optional remote desktop page, deployed separately |
| `HERMES_HOME` | Hermes data directory; defaults to the user's `.hermes` |
| `HERMES_BIN` | Hermes executable; defaults to `hermes` |

Put the first four in `.env.local`. The Hermes API module reads `process.env` at import time; set the last two in the process environment rather than only in that file:

```powershell
$env:HERMES_HOME = 'D:\my-hermes-data'
$env:HERMES_BIN = 'D:\tools\hermes.exe'
npm run dev
```

Replace example paths. These temporary variables affect child processes of that terminal, not a launcher opened independently.

## Authentication and state

The user directory's `.hermes-web-shell` stores passwords, local pairing credentials, and `sessions.json`. Session tokens are persisted as hashes. Cookies use HttpOnly and SameSite=Strict, plus Secure on HTTPS requests.

Pairing credentials remain in memory for five minutes and work once. Links use a fragment cleared before redemption. Refreshing invalidates previous codes from the same owner; restart clears unredeemed codes.

The native launcher uses a local file credential plus checks for loopback, Host, Origin, and proxy headers. Loopback alone cannot grant access because Cloudflare also connects through loopback. Local pairing authority does not grant chat API access. All signed-in browser sessions can manage devices.

## Validation

```powershell
npm run build
npm run lint
node --experimental-strip-types --test scripts/test-access.mjs
python -m unittest discover -s scripts -p test_decode_screenshots.py
```

The last check requires Python and applies to screenshot recovery. Authentication tests cover login, single-use redemption, persistence, revocation, origin rejection, and local authority boundaries. They do not replace real phone/browser/network testing.

## Contributing

Explain the problem, validation, and limitations. Never commit local configuration, user state, QR credentials, or secrets. Use demo conversations in screenshots and identify historical images. See [screenshot recovery](screenshots/README.md).
