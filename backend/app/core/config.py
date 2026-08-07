from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./studypair.db"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    JWT_SECRET: str = "change-me"
    # Separate from JWT_SECRET on purpose: this only signs the short-lived
    # OAuth handshake cookie (CSRF state + OIDC nonce between /auth/google/login
    # and /auth/google/callback). Keeping it distinct from JWT_SECRET means a
    # leak of one doesn't also compromise the other (session cookie vs. every
    # issued access token). Falls back to JWT_SECRET only if unset, so existing
    # .env files without this key don't break.
    SESSION_SECRET: str = ""

    # Origin of the React web app. Used for (1) the CORS allow-list and
    # (2) where /auth/google/callback redirects after login, since a
    # browser-based SPA can't read a JSON body returned directly from the
    # OAuth redirect the way a mobile app's WebView could.
    FRONTEND_URL: str = "http://localhost:5173"
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""

    # Symmetric key (Fernet, 32 url-safe base64 bytes) used to encrypt PII
    # columns such as User.phone_number at rest. Generate one with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Left blank only to let the app import without crashing in tooling
    # contexts (e.g. alembic autogenerate) — core/encryption.py raises
    # loudly at first actual use if it's still empty.
    FIELD_ENCRYPTION_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
