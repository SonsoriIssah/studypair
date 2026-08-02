from fastapi import FastAPI

from app.routers import admin, auth, students, tutors

app = FastAPI(title="StudyPair")

app.include_router(auth.router)
app.include_router(tutors.router)
app.include_router(students.router)
app.include_router(admin.router)


@app.get("/health")
def health():
    return {"status": "ok"}
