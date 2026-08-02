from fastapi import APIRouter

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/health")
def health():
    return {"status": "ok"}
