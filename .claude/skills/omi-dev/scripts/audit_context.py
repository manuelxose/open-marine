#!/usr/bin/env python3
"""Report files that are expensive or noisy for agent context."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

NOISY_PARTS = {
    "node_modules",
    "dist",
    "dist-tmp",
    ".angular",
    "coverage",
    ".git",
}


def git_files(root: Path) -> list[Path]:
    result = subprocess.run(
        ["git", "-C", str(root), "ls-files"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [root / line for line in result.stdout.splitlines() if line.strip()]


def is_noisy(path: Path) -> bool:
    return any(part in NOISY_PARTS for part in path.parts)


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.joinpath(".git").exists():
        print(f"Not a git repository: {root}", file=sys.stderr)
        return 2

    files = git_files(root)
    noisy = [p for p in files if is_noisy(p.relative_to(root))]
    large = sorted(
        ((p.stat().st_size, p.relative_to(root)) for p in files if p.exists() and p.is_file()),
        reverse=True,
    )[:20]

    print("Tracked noisy/generated files:")
    if noisy:
        for path in noisy[:50]:
            print(f"  {path.relative_to(root)}")
        if len(noisy) > 50:
            print(f"  ... {len(noisy) - 50} more")
    else:
        print("  none")

    print("\nLargest tracked files:")
    for size, path in large:
        print(f"  {size:>10}  {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
