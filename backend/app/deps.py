"""Shared request dependencies for the tutor and student routers.

Real auth has landed (`app/core/security.py`) — this now just re-exports its
`get_current_user`, so `tutors.py`/`students.py` don't need to change their
imports. The debug-header fallback that used to live here is gone; both
routers only ever called `get_current_user(...)` positionally via `Depends`,
so this swap is transparent to them.
"""
from app.core.security import get_current_user

__all__ = ["get_current_user"]
