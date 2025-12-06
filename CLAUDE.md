# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Groomify is a full-stack application with a FastAPI backend and React + TypeScript frontend. The project uses PostgreSQL for the database, with SQLAlchemy ORM and Alembic for migrations.

Do not provide detail logs of your progress. use 1 line sentence for your progress. No details of your workings is required when you are in edit automatically mode. 

## Architecture

### Backend (Python/FastAPI)
- **Framework**: FastAPI with uvicorn server
- **Database**: PostgreSQL with SQLAlchemy 2.0 and Alembic migrations
- **Structure**:
  - `backend/app/core/`: Core configuration (config.py, database.py, logger.py)
  - `backend/app/api/`: API route handlers
  - `backend/app/models/`: SQLAlchemy ORM models
  - `backend/app/schemas/`: Pydantic schemas for request/response validation
  - `backend/app/services/`: Business logic layer
  - `backend/migrations/`: Alembic database migrations
  - `backend/main.py`: CLI entry point with Click commands

- **Application Factory**: The app is created via `create_app()` in `app/web_app.py`
- **Middleware**: CORS configured for development (localhost:5173, 3000, 4173) and production
- **Debug Logging**: Comprehensive request/response logging when `DEBUG=true` in environment

### Frontend (React + TypeScript)
- **Build Tool**: Vite with SWC plugin for fast refresh
- **UI Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Component Library**: Radix UI primitives with custom button component in `src/components/ui/`

### Database Configuration
- Default connection: `postgresql://postgres:admin@localhost:5432/groomify`
- Connection pooling enabled with `pool_pre_ping=True` for connection health checks
- Database session management via `get_db()` dependency injection

## Development Commands

### Backend
```bash
# Navigate to backend directory
cd backend

# Install dependencies
uv sync

# Start development server (with auto-reload) - RECOMMENDED
uv run python main.py serve

# Alternative: Activate venv first, then run
source .venv/bin/activate
python main.py serve

# Start production server
uv run python main.py serve --production --workers 4

# Custom host/port
uv run python main.py serve --host 0.0.0.0 --port 8000

# Database migrations
uv run alembic revision --autogenerate -m "description"
uv run alembic upgrade head
uv run alembic downgrade -1

# Run tests
uv run pytest tests/ -v

# Run tests with coverage
uv run pytest tests/ --cov=app --cov-report=html
```

### Frontend
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Key Configuration

### Environment Variables (Backend)
- `DATABASE_URL`: PostgreSQL connection string for development
- `TEST_DATABASE_URL`: PostgreSQL connection string for tests (separate database)
- `DEBUG`: Enable debug logging and development mode (`true`/`false`)
- `SECRET_KEY`: Security key for JWT/sessions
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time
- `CORS_ORIGINS`: Comma-separated allowed origins

### Configuration Loading
- Backend uses `python-dotenv` to load `.env` file from `backend/.env`
- Settings are centralized in `app/core/config.py` with the `Settings` class
- Access via `from app.core.config import settings`

## Important Implementation Details

### Database Sessions
- Use FastAPI dependency injection: `db: Session = Depends(get_db)`
- Sessions auto-close via context manager in `get_db()`
- Never commit in route handlers; let services handle transactions

### CORS Configuration
- Development: Allows localhost ports 3000, 4173, 5173 (both localhost and 127.0.0.1)
- Regex pattern matches subdomains in dev: `http://.*\.localhost:3000`
- Production: Uses `https://.*` pattern

### Validation Error Logging
- Custom `RequestValidationError` handler in `web_app.py` provides detailed logging
- Logs validation errors with field paths, types, and request body
- Returns standard 422 response with error details

### Health Check
- Available at `GET /health`
- Returns status and UTC timestamp
- Use for load balancer health checks

## Package Management

### Backend
- Uses `uv` for Python package management
- Dependencies defined in `pyproject.toml`
- Requires Python >=3.10

### Frontend
- Uses npm (package-lock.json present)
- Compatible with pnpm (pnpm-lock.yaml present)
- Uses Vite 7.x with React 19

## Testing

### Backend Tests
- Tests use real PostgreSQL database defined in `TEST_DATABASE_URL` environment variable
- Default test database: `postgresql://postgres:admin@localhost:5432/groomify_test`
- Each test runs in isolation with database cleanup after each test
- Test fixtures create/drop tables as needed
- Run tests with: `uv run pytest tests/ -v`

### Testing Best Practices
- Tests use the same database engine as production (PostgreSQL)
- Database schema is created before each test
- Data is cleaned up after each test (tables remain, data is deleted)
- Use fixtures for common setup (see `tests/conftest.py`)

## Port Configuration
- Backend API server: port 8000 (default)
- Frontend dev server: port 5173 (Vite default)
- PostgreSQL database: port 5432 (standard)


