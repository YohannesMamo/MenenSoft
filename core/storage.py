"""Resolve a writable directory for user file uploads.

Some hosts (for example Pxxl) run the container with a read-only root
filesystem, so writing next to the application code fails with
``OSError: [Errno 30] Read-only file system``. Because ``main.py`` and
``routes/chat.py`` used to create the uploads directory at import time, that
failure took the whole process down before it could serve a single request.

Instead, pick the first location that is actually writable:

1. the ``UPLOAD_DIR`` environment variable, when set
2. ``<backend>/uploads`` -- Render and local development
3. ``<system temp>/menen-uploads`` -- read-only-root hosts such as Pxxl

Nothing here raises: probing is best effort so the application can always
import. If *no* candidate is writable the last one is returned and uploads
fail at request time with a clear error instead of at startup.
"""

import os
import tempfile
from pathlib import Path
from typing import Iterable

APP_DIR = Path(__file__).resolve().parent.parent


def _is_writable(directory: Path) -> bool:
    """Return True if ``directory`` can be created/used for writing."""
    try:
        directory.mkdir(parents=True, exist_ok=True)
        probe = directory / ".write-probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return True
    except OSError:
        return False


def _candidates() -> Iterable[Path]:
    env_dir = os.getenv("UPLOAD_DIR")
    if env_dir:
        yield Path(env_dir).expanduser()
    yield APP_DIR / "uploads"
    yield Path(tempfile.gettempdir()) / "menen-uploads"


def resolve_upload_root() -> Path:
    candidates = list(_candidates())
    for candidate in candidates:
        if _is_writable(candidate):
            return candidate
    return candidates[-1]


UPLOAD_ROOT: Path = resolve_upload_root()
CHAT_UPLOAD_DIR: Path = UPLOAD_ROOT / "chat_files"
