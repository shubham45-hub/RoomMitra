from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent


def load_project_environment() -> None:
    """Load generated root Neon settings, then backend defaults without overwriting."""
    for env_file in (
        PROJECT_ROOT / ".env.local",
        PROJECT_ROOT / ".env",
        BACKEND_DIR / ".env",
    ):
        load_dotenv(env_file, override=False)
