from fastapi import APIRouter

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
def health():
    return {"status": "ok"}
