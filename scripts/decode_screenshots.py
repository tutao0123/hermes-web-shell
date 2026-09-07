"""Manual recovery for legacy base64 uploads. Prefer committing original PNGs."""
import base64
import json
from pathlib import Path
import struct
import zlib


def local_file(root, name):
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError(f"Path outside screenshot directory: {name}")
    return path


def validate_png(raw):
    if not raw.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Not a PNG")
    pos = 8
    first = True
    has_data = False
    while pos + 12 <= len(raw):
        size = struct.unpack_from(">I", raw, pos)[0]
        end = pos + 12 + size
        if end > len(raw):
            raise ValueError("Truncated PNG chunk")
        kind = raw[pos + 4:pos + 8]
        data = raw[pos + 8:end - 4]
        checksum = struct.unpack_from(">I", raw, end - 4)[0]
        if zlib.crc32(kind + data) != checksum:
            raise ValueError("PNG checksum mismatch")
        if first and (kind != b"IHDR" or size != 13):
            raise ValueError("Missing PNG header")
        first = False
        has_data |= kind == b"IDAT"
        if kind == b"IEND":
            if size or end != len(raw) or not has_data:
                raise ValueError("Invalid PNG end")
            return
        pos = end
    raise ValueError("Incomplete PNG: missing IEND")


def decode(root):
    targets = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))["targets"]
    if not targets:
        raise ValueError("No screenshot targets")
    outputs = {}
    missing = []
    for target in targets:
        output = local_file(root, target["output"])
        if output.suffix.lower() != ".png" or output in outputs:
            raise ValueError("Expected unique PNG output names")
        parts = target.get("parts") or [target.get("b64", "")]
        if any(not name for name in parts):
            raise ValueError(f"No input parts for {output.name}")
        files = [local_file(root, name) for name in parts]
        absent = [path.name for path in files if not path.is_file()]
        if absent:
            missing.extend(absent)
            continue
        encoded = "".join("".join(path.read_text(encoding="ascii").split()) for path in files)
        raw = base64.b64decode(encoded, validate=True)
        validate_png(raw)
        outputs[output] = raw
    if missing:
        raise ValueError("Upload incomplete; missing parts:\n" + "\n".join(missing))
    # Validate every target before writing anything; incomplete input cannot
    # overwrite a previously valid image.
    for output, raw in outputs.items():
        output.write_bytes(raw)
        print(f"Decoded {output.name}: {len(raw)} bytes")
    return len(outputs)


if __name__ == "__main__":
    try:
        decode(Path(__file__).resolve().parents[1] / "docs" / "screenshots")
    except (ValueError, KeyError, OSError) as error:
        raise SystemExit(str(error)) from error
