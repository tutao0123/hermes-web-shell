---
name: hermes-phone-pair
description: "Pair phone with local Hermes web shell via QR code in chat."
version: 0.1.0
author: Tao, Hermes Agent
license: MIT
platforms: [windows, macos, linux]
metadata:
  hermes:
    tags: [mobile, phone, pairing, qr-code, hermes-web-shell]
    related_skills: []
---

# Hermes Phone Pair Skill

Generate single-use QR codes and direct links to connect mobile phones to the local Hermes Web Shell directly inside the chat.

## When to Use

- User asks to connect phone: "连接手机", "配对手机", "手机连不上", "生成配对码", "手机扫码".
- User asks to view connected devices or revoke them: "已连接设备", "断开手机", "踢掉手机", "清理手机登录".
- Do not use for: configuring remote messaging gateways (Telegram/Discord bots).

## Prerequisites

- Local Hermes Web Shell installed at `F:/hermes-web-shell` (running on port 5174).
- State directory at `~/.hermes-web-shell/`.

## How to Run

1. Generate a pairing QR code and link:
   ```bash
   node F:/hermes-web-shell/scripts/pair-cli.mjs pair
   ```
   The CLI outputs JSON with `qrPath`, `link`, `isLan`, and `expiresInSeconds`.
   If the service is not running, start it in the background:
   ```bash
   cd /f/hermes-web-shell && npm run dev
   ```

2. Inspect connected devices:
   ```bash
   node F:/hermes-web-shell/scripts/pair-cli.mjs devices
   ```

3. Revoke all devices:
   ```bash
   node F:/hermes-web-shell/scripts/pair-cli.mjs clear
   ```

## Output Format

When generating a pairing code:
1. Deliver the QR code directly into chat using `MEDIA:<qrPath>`.
2. Provide the direct clickable markdown link `[点击直接连接](<link>)` for easy copy/paste.
3. State whether this is LAN mode (`局域网直连`) or public domain mode (`公网访问`), the 5-minute single-use expiry, and the session duration.
