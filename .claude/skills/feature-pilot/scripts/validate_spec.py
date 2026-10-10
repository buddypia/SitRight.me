#!/usr/bin/env python3
"""
feature-pilot SPEC validation wrapper

Calls spec-validator's validate.py to perform placeholder validation on SPEC files.

Usage:
    python validate_spec.py <SPEC_PATH>
    python validate_spec.py docs/features/001-user-dashboard/SPEC-001.md
"""

import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent
VALIDATOR_SCRIPT = (
    PROJECT_ROOT / ".claude" / "skills" / "spec-validator" / "scripts" / "validate.py"
)


def check_placeholders(spec_path: Path) -> list[str]:
    """Check for remaining placeholders in SPEC file"""
    errors = []
    content = spec_path.read_text(encoding="utf-8")

    placeholders = [
        ("{{", "Unresolved template variable"),
        ("TODO:", "Incomplete TODO"),
        ("TBD", "Undecided item (TBD)"),
        ("FIXME", "Item requiring fix (FIXME)"),
    ]

    for i, line in enumerate(content.split("\n"), 1):
        for marker, desc in placeholders:
            if marker in line:
                errors.append(f"L{i}: {desc} — {line.strip()[:80]}")

    return errors


def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_spec.py <SPEC_PATH>")
        sys.exit(1)

    spec_path = Path(sys.argv[1])
    if not spec_path.exists():
        # Retry with relative path
        spec_path = PROJECT_ROOT / sys.argv[1]
        if not spec_path.exists():
            print(f"❌ SPEC file not found: {sys.argv[1]}")
            sys.exit(1)

    print(f"## feature-pilot SPEC validation: {spec_path.name}\n")

    # Phase 1: Placeholder check
    print("### Phase 1: Placeholder Validation")
    placeholder_errors = check_placeholders(spec_path)
    if placeholder_errors:
        print(f"❌ Remaining placeholders: {len(placeholder_errors)} found")
        for err in placeholder_errors:
            print(f"   - {err}")
    else:
        print("✅ No placeholders found")

    # Phase 2: Call spec-validator
    print("\n### Phase 2: JSON Schema / Structural Validation")
    if VALIDATOR_SCRIPT.exists():
        result = subprocess.run(
            [sys.executable, str(VALIDATOR_SCRIPT), str(spec_path)],
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        has_errors = bool(placeholder_errors) or result.returncode != 0
        sys.exit(1 if has_errors else 0)
    else:
        print(f"⚠️ spec-validator script not found at: {VALIDATOR_SCRIPT}")
        print("   Executed placeholder validation only.")
        sys.exit(1 if placeholder_errors else 0)


if __name__ == "__main__":
    main()
