#!/usr/bin/env python3
"""Build the bundled Quest font set from pinned upstream ZIP files."""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import shutil
import zipfile
import wave


SOURCE_SHA = "c0efa33d460d0d90a0cc8e32632e29adc6219b12"
SELECTION = {
    "Bode Akuna": "bode-akuna",
    "Cere Junda": "cere-junda",
    "Darth Vader": "darth-vader",
    "Ninth Sister": "ninth-sister",
    "Second Sister": "second-sister",
}
CAPABILITIES = {"blst", "clsh", "stab", "lock", "bgnlock", "endlock",
                "drag", "enddrag", "melt", "bgnmelt", "endmelt", "force", "spin"}


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""):
            h.update(b)
    return h.hexdigest()


def safe_relative(name: str) -> pathlib.PurePosixPath:
    p = pathlib.PurePosixPath(name)
    if p.is_absolute() or any(part in ("", ".", "..") for part in p.parts):
        raise ValueError(f"unsafe ZIP path: {name!r}")
    return p


def validate_font(z: zipfile.ZipFile, source_prefix: str, display_name: str):
    entries = [i for i in z.infolist() if i.filename.startswith(source_prefix) and not i.is_dir()]
    if not entries:
        raise ValueError(f"missing Proffie font directory: {display_name}")
    rels = [safe_relative(i.filename[len(source_prefix):]).as_posix() for i in entries]
    by_rel = dict(zip(rels, entries))
    required = ["smoothsw.ini", "config.ini"]
    for r in required:
        if r not in by_rel:
            raise ValueError(f"{display_name}: missing {r}")
    ini = z.read(by_rel["smoothsw.ini"]).decode("utf-8", errors="replace")
    if "Version=2" not in ini and "Version = 2" not in ini and "Version=2.0" not in ini:
        raise ValueError(f"{display_name}: smoothsw.ini is not clearly SmoothSwing V2")
    families = {r.split("/", 1)[0].lower() for r in rels if "/" in r}
    if not {"hum", "out", "in", "swingl", "swingh"}.issubset(families):
        raise ValueError(f"{display_name}: missing hum/ignition/retraction/swing pair family")
    for family in ("swingl", "swingh"):
        names = [r.rsplit("/", 1)[-1] for r in rels if r.startswith(family + "/") and r.lower().endswith(".wav")]
        if not names:
            raise ValueError(f"{display_name}: no WAV files in {family}")
    pair_numbers = {}
    for family in ("swingl", "swingh"):
        numbers = set()
        for r in rels:
            if r.startswith(family + "/") and r.lower().endswith(".wav"):
                match = re.fullmatch(family + r"0*(\d+)", pathlib.PurePosixPath(r).stem.lower())
                if not match:
                    raise ValueError(f"{display_name}: unsupported {family} naming: {r}")
                numbers.add(int(match.group(1)))
        pair_numbers[family] = numbers
    if pair_numbers["swingl"] != pair_numbers["swingh"]:
        raise ValueError(f"{display_name}: mismatched low/high swing pair numbers")
    for rel, info in by_rel.items():
        if not rel.lower().endswith(".wav"):
            continue
        import io
        try:
            with wave.open(io.BytesIO(z.read(info)), "rb") as wav:
                if wav.getsampwidth() != 2 or not (1 <= wav.getnchannels() <= 2) or wav.getframerate() < 8000:
                    raise ValueError(f"{display_name}: unsupported WAV format: {rel}")
                if not wav.getnframes():
                    raise ValueError(f"{display_name}: empty WAV: {rel}")
        except (wave.Error, EOFError) as exc:
            raise ValueError(f"{display_name}: invalid WAV: {rel}: {exc}") from exc
    effects = sorted(f for f in CAPABILITIES if f in families or any(
        "/" not in r and pathlib.PurePosixPath(r).name.lower().startswith(f)
        for r in rels if r.lower().endswith(".wav")))
    return entries, rels, families, effects


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ferase-zip", required=True, type=pathlib.Path)
    ap.add_argument("--smthjedi-zip", required=True, type=pathlib.Path)
    ap.add_argument("--asset-dir", required=True, type=pathlib.Path)
    args = ap.parse_args()
    if not zipfile.is_zipfile(args.ferase_zip) or not zipfile.is_zipfile(args.smthjedi_zip):
        raise SystemExit("both upstream inputs must be valid ZIP archives")
    if args.asset_dir.exists():
        shutil.rmtree(args.asset_dir)
    args.asset_dir.mkdir(parents=True)
    records = []
    with zipfile.ZipFile(args.ferase_zip) as z:
        for display_name, stable_id in SELECTION.items():
            prefix = f"Proffie/{display_name}/"
            entries, rels, families, effects = validate_font(z, prefix, display_name)
            target = args.asset_dir / "fonts" / stable_id
            total = 0
            for info, rel in zip(entries, rels):
                dest = target.joinpath(*safe_relative(rel).parts)
                dest.parent.mkdir(parents=True, exist_ok=True)
                data = z.read(info)
                dest.write_bytes(data)
                total += len(data)
            records.append({
                "id": stable_id, "display_name": display_name,
                "folder": f"fonts/{stable_id}", "file_count": len(entries),
                "expanded_bytes": total, "effect_families": effects,
                "smooth_swing_version": 2,
            })
        # Preserve the author's full README/disclaimer beside the bundled pack.
        if "README.md" in z.namelist():
            credits = args.asset_dir / "credits" / "Ferase-README.md"
            credits.parent.mkdir(parents=True, exist_ok=True)
            credits.write_bytes(z.read("README.md"))

    with zipfile.ZipFile(args.smthjedi_zip) as z:
        prefix = "SmthJedi/"
        target = args.asset_dir / "fonts" / "smthjedi"
        for info in z.infolist():
            if info.is_dir() or not info.filename.startswith(prefix):
                continue
            rel = safe_relative(info.filename[len(prefix):])
            dest = target.joinpath(*rel.parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(z.read(info))
        if not (target / "smoothsw.ini").is_file():
            # Existing Mission 001 ZIPs have the font directory as an archive root.
            candidate = args.asset_dir / "fonts" / "smthjedi" / "SmthJedi"
            if (candidate / "smoothsw.ini").is_file():
                for item in candidate.iterdir():
                    shutil.move(str(item), str(target / item.name))
                candidate.rmdir()
            else:
                raise ValueError("SmthJedi ZIP did not contain smoothsw.ini")

    smth_path = args.asset_dir / "fonts" / "smthjedi"
    smth_families = {p.name.lower() for p in smth_path.iterdir() if p.is_dir()}
    records.insert(0, {
        "id": "smthjedi", "display_name": "SmthJedi",
        "folder": "fonts/smthjedi", "file_count": sum(1 for p in smth_path.rglob("*") if p.is_file()),
        "expanded_bytes": sum(p.stat().st_size for p in smth_path.rglob("*") if p.is_file()),
        "effect_families": sorted(f for f in CAPABILITIES if f in smth_families or any(
            p.is_file() and p.suffix.lower()==".wav" and p.stem.lower().startswith(f)
            for p in smth_path.iterdir())),
        "smooth_swing_version": 2,
    })
    manifest = {
        "ferase_source": "https://github.com/Ferase/JediSurvivor-Soundfonts/releases/tag/v3.8",
        "ferase_commit": SOURCE_SHA,
        "ferase_archive_sha256": sha256(args.ferase_zip),
        "font_notice": "Ferase's README states the audio is from Respawn Entertainment; see credits/Ferase-README.md. No font is labeled Luke ROTJ audio.",
        "fonts": records,
    }
    (args.asset_dir / "font_manifest.json").write_text(json.dumps(manifest, indent=2)+"\n", encoding="utf-8")
    # Data-driven menu choices. These intentionally call the Ferase fonts
    # auditions, not Luke ROTJ recordings: the visual profile is Luke, while
    # the audio assignment is explicitly temporary.
    profile_rows = [
        ("luke-rotj-smthjedi", "Luke ROTJ / SmthJedi proxy", "smthjedi", "Luke ROTJ visual; temporary SmthJedi audio proxy"),
        ("luke-rotj-bode", "Luke ROTJ / Bode Akuna audition", "bode-akuna", "Luke ROTJ visual; Bode Akuna audio audition"),
        ("luke-rotj-cere", "Luke ROTJ / Cere Junda audition", "cere-junda", "Luke ROTJ visual; Cere Junda audio audition"),
        ("luke-rotj-vader", "Luke ROTJ / Darth Vader audition", "darth-vader", "Luke ROTJ visual; Darth Vader audio audition"),
        ("luke-rotj-ninth", "Luke ROTJ / Ninth Sister audition", "ninth-sister", "Luke ROTJ visual; Ninth Sister audio audition"),
        ("luke-rotj-second", "Luke ROTJ / Second Sister audition", "second-sister", "Luke ROTJ visual; Second Sister audio audition"),
    ]
    profile_file = args.asset_dir / "saber_profiles.tsv"
    profile_file.write_text("id\tdisplay_name\thilt_asset\tfont_directory\tblade_rgb\tblade_length_m\teffects\tnote\n" + "".join(
        f"{pid}\t{name}\tsaber/luke_rotj.mesh\tfonts/{folder}\t0.08,1.0,0.16\t0.92\t{','.join(next(x['effect_families'] for x in records if x['id']==folder))}\t{note}\n"
        for pid, name, folder, note in profile_rows), encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
