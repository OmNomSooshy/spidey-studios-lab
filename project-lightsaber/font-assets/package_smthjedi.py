#!/usr/bin/env python3
"""Build a verified ZIP containing only the pinned upstream SmthJedi font."""

import argparse
import concurrent.futures
import hashlib
import json
import sys
import urllib.request
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "font-assets" / "smthjedi-manifest.json"
RAW_BASE = "https://raw.githubusercontent.com/profezzorn/SoundFonts"


def fetch_file(commit: str, entry: dict) -> tuple[dict, bytes]:
    path = entry["path"]
    url = f"{RAW_BASE}/{commit}/SmthJedi/{path}"
    request = urllib.request.Request(url, headers={"User-Agent": "Project-Lightsaber-font-packager/1"})
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
    git_blob_sha = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
    if len(data) != entry["size"] or git_blob_sha != entry["git_blob_sha1"]:
        raise RuntimeError(f"Upstream verification failed for {path}")
    return entry, data


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("SmthJedi-ProffieOS.zip"))
    args = parser.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    commit = manifest["commit"]
    entries = manifest["files"]
    required = {"ReadMe.txt", "license.txt", "hum.wav", "in.wav", "out.wav", "smoothsw.ini"}
    names = {entry["path"] for entry in entries}
    if not required.issubset(names):
        raise RuntimeError("Pinned font manifest is missing required font/config/license files")
    for index in range(1, 9):
        if f"swingl/swingl{index:02}.wav" not in names or f"swingh/swingh{index:02}.wav" not in names:
            raise RuntimeError(f"Pinned font manifest is missing swing pair {index:02}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        downloaded = list(pool.map(lambda entry: fetch_file(commit, entry), entries))

    with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for entry, data in downloaded:
            archive.writestr(f"SmthJedi/{entry['path']}", data)

    expected = {f"SmthJedi/{entry['path']}" for entry in entries}
    with zipfile.ZipFile(args.output, "r") as archive:
        if set(archive.namelist()) != expected:
            raise RuntimeError("Generated ZIP contents differ from the pinned single-font manifest")
        bad = archive.testzip()
        if bad:
            raise RuntimeError(f"Generated ZIP failed CRC validation at {bad}")
        expanded = sum(info.file_size for info in archive.infolist())
    if expanded >= 256 * 1024 * 1024:
        raise RuntimeError("Single-font archive exceeds the Android ZIP extraction limit")

    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    print(f"font={manifest['font']}")
    print(f"source={manifest['upstream']}@{commit}")
    print(f"files={len(entries)} expanded_bytes={expanded}")
    print(f"zip={args.output} size_bytes={args.output.stat().st_size} sha256={digest}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # Print a concise, actionable CI failure.
        print(f"SmthJedi packaging failed: {error}", file=sys.stderr)
        raise SystemExit(1)
