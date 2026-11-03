
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.environment import BACKEND_DIR, load_project_environment

load_project_environment()


def _sqlalchemy_url(url: str) -> str:
    """Select the psycopg 3 dialect used by the backend requirements."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url

DATABASE_URL = _sqlalchemy_url(os.getenv("DATABASE_URL", ""))
ALEMBIC_DATABASE_URL = _sqlalchemy_url(
    os.getenv("DATABASE_URL_UNPOOLED") or DATABASE_URL
)

if not DATABASE_URL:
    raise RuntimeError(
        f"DATABASE_URL not found. Set it in the repository or backend environment files (backend: {BACKEND_DIR})."
    )

is_vercel = os.getenv("VERCEL", "").lower() == "1"
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=int(os.getenv("DB_POOL_SIZE", "1" if is_vercel else "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "0" if is_vercel else "10")),
    pool_recycle=1800,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
