from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.routes.locations import router as locations_router

from app.config import settings, validate_settings
from app.routes.auth import router as auth_router
from app.routes.listings import router as listings_router
from app.routes.moderation import router as moderation_router

validate_settings()

app = FastAPI(title="RoomMitra API")
settings.upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.allowed_hosts))

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)

app.include_router(auth_router)
app.include_router(listings_router)
app.include_router(locations_router)
app.include_router(moderation_router)


@app.get("/health")
def health():
    return {"status": "ok"}
