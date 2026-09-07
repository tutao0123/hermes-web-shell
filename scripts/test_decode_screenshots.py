import base64
import json
from pathlib import Path
import struct
import tempfile
import unittest
import zlib

from decode_screenshots import decode


def png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
            + chunk(b"IEND", b""))


class DecodeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "MANIFEST.json").write_text(json.dumps({"targets": [
            {"output": "image.png", "parts": ["part00", "part01"]}
        ]}))

    def write_parts(self, raw):
        encoded = base64.b64encode(raw).decode()
        (self.root / "part00").write_text(encoded[:17] + "\n")
        (self.root / "part01").write_text(encoded[17:])

    def test_complete_parts_decode_exactly(self):
        self.write_parts(png())
        self.assertEqual(decode(self.root), 1)
        self.assertEqual((self.root / "image.png").read_bytes(), png())

    def test_missing_parts_preserve_existing_image(self):
        (self.root / "image.png").write_bytes(png())
        (self.root / "part00").write_text("abc")
        with self.assertRaisesRegex(ValueError, "part01"):
            decode(self.root)
        self.assertEqual((self.root / "image.png").read_bytes(), png())

    def test_truncated_image_is_not_written(self):
        self.write_parts(png()[:-12])
        with self.assertRaisesRegex(ValueError, "Incomplete PNG"):
            decode(self.root)
        self.assertFalse((self.root / "image.png").exists())

    def test_bad_checksum_is_not_written(self):
        raw = bytearray(png())
        raw[29] ^= 1
        self.write_parts(raw)
        with self.assertRaisesRegex(ValueError, "checksum"):
            decode(self.root)
        self.assertFalse((self.root / "image.png").exists())

    def test_output_cannot_escape_directory(self):
        (self.root / "MANIFEST.json").write_text(json.dumps({"targets": [
            {"output": "../escape.png", "parts": ["part00"]}
        ]}))
        with self.assertRaisesRegex(ValueError, "outside"):
            decode(self.root)


if __name__ == "__main__":
    unittest.main()
