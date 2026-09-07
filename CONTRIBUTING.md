# Contributing

Issues and pull requests are welcome.

## Guidelines

- For **small fixes** (typos, docs, obvious bugs): open a PR directly.
- For **larger changes** (new features, API shape, UI overhaul): please open an issue first so we can discuss direction before you invest time.
- Keep PRs focused; include a short description of *why* and how to test.
- Do not commit credentials, `.env` files, `node_modules`, `dist`, or personal tunnel certificates.

## Local development

```bash
bun install   # or: npm install / pnpm install
bun run dev   # http://127.0.0.1:5174
```

Requires a local Hermes Agent install for live data; offline mode falls back to mock data.
