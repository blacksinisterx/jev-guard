import re

# Deterministic, free, instant. Runs before Jev so unambiguous cases never
# cost a model call. Jev only sees the long tail these don't cover.
HARD_DENY_PATTERNS = [
    (r"rm\s+-rf\s+/(\s|$)", "recursive delete of root filesystem"),
    (r"--no-preserve-root", "explicit root-filesystem override on a delete"),
    (r"\bdrop\s+table\b", "SQL DROP TABLE"),
    (r"\btruncate\s+table\b", "SQL TRUNCATE TABLE"),
    (r"format\s+c:", "formatting the system drive"),
    (r"del\s+/f\s+/s\s+/q\s+[a-z]:\\", "recursive force-delete of a drive"),
    (r":\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:", "fork bomb"),
]

HARD_ALLOW_PATTERNS = [
    r"^ls(\s|$)",
    r"^cat\s",
    r"^git\s+(status|log|diff|show)\b",
    r"^pwd$",
]

_DENY = [(re.compile(p, re.IGNORECASE), reason) for p, reason in HARD_DENY_PATTERNS]
_ALLOW = [re.compile(p, re.IGNORECASE) for p in HARD_ALLOW_PATTERNS]


def check_hard_rules(text: str) -> tuple[str, str] | None:
    """Returns (verdict, reason) if a hard rule fires, else None (fall through to Jev)."""
    for pattern, reason in _DENY:
        if pattern.search(text):
            return "block", f"matched hard rule: {reason}"
    for pattern in _ALLOW:
        if pattern.match(text.strip()):
            return "allow", "matched hard allowlist: read-only command"
    return None
