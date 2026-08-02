from fastapi import APIRouter

router = APIRouter(prefix="/tutors", tags=["tutors"])


@router.get("/health")
def health():
    return {"status": "ok"}
