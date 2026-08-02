# StudyPair

A platform for university students to find and book peer tutors. See [docs/SCHEMA.md](docs/SCHEMA.md) for the data model and [docs/DECISIONS.md](docs/DECISIONS.md) for product decisions.

This repo currently contains only the shared backend foundation — no feature logic (auth, dashboards, matching) is implemented yet.

## Backend setup

```bash
git clone <repo-url>
cd studypair/backend
```

Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy the example environment file and fill in values:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d
```

Apply database migrations:

```bash
alembic upgrade head
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`, with a health check at `http://localhost:8000/health`.

## Frontend

The mobile app lives in `frontend/` as a separate React Native project (not yet scaffolded).
