"""Outbound transactional email via Resend's HTTP API.

Only used for the signup email-verification code today. httpx is already a
dependency (Authlib pulls it in for the OAuth flow), so this needs no new
package.
"""
import httpx

from app.core.config import settings


def send_email(to: str, subject: str, html: str) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "RESEND_API_KEY is not set. Get one from https://resend.com and put it in your .env file."
        )

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}"},
        json={
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to],
            "subject": subject,
            "html": html,
        },
        timeout=10.0,
    )
    response.raise_for_status()
