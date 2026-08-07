from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers import admin, auth, students, tutors

app = FastAPI(title="StudyPair")

# Authlib's OAuth flow stores the CSRF state and OIDC nonce in
# request.session between /auth/google/login and /auth/google/callback —
# required for Google sign-in to work at all. Signed with its own secret
# (falling back to JWT_SECRET only if SESSION_SECRET isn't set) so this
# short-lived handshake cookie doesn't share a key with long-lived JWTs.
app.add_middleware(
    SessionMiddleware, secret_key=settings.SESSION_SECRET or settings.JWT_SECRET
)

# The React app runs on a different origin (e.g. localhost:5173) than the
# API (localhost:8000), so the browser blocks every fetch() without this.
# allow_credentials is needed because the OAuth login/callback round trip
# relies on the session cookie set by SessionMiddleware above.
_allowed_origins = [
    origin.strip()
    for origin in f"{settings.FRONTEND_URL},{settings.FRONTEND_ORIGINS}".split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tutors.router)
app.include_router(students.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
