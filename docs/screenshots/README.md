# Screenshots

Prefer copying the original PNG files into this directory and committing them
with Git. Git supports binary images directly; base64 splitting is unnecessary
when working in a local checkout.

Historical base64 uploads can be recovered only when all manifest parts are available. Prefer original PNG files committed directly.

If a text-only upload tool must be used, upload **all** parts listed in the
manifest, then manually run the **Decode screenshot base64** workflow. It checks
for missing parts and PNG chunk checksums before writing outputs. Download the
`decoded-screenshots` artifact and add those PNGs in a normal Git commit.
The workflow does not push commits or run on every partial upload.

Local recovery: `python scripts/decode_screenshots.py` from the repository root.
