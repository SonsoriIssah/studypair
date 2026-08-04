from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.routers import admin, auth, students, tutors

app = FastAPI(title="StudyPair")

# Authlib's OAuth flow stores the CSRF state and OIDC nonce in
# request.session between /auth/google/login and /auth/google/callback —
# required for Google sign-in to work at all.
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET)

app.include_router(auth.router)
app.include_router(tutors.router)
app.include_router(students.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
