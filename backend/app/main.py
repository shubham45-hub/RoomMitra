from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from app.routes.locations import router as locations_router

from app.config import validate_settings
from app.routes.auth import router as auth_router
from app.routes.listings import router as listings_router
from app.routes.moderation import router as moderation_router

validate_settings()

app = FastAPI(title="RoomMitra API")
UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(locations_router)
app.include_router(moderation_router)


@app.get("/health")
def health():
    return {"status": "ok"}
