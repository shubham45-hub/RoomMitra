"""Neon S3-compatible object storage with a local filesystem fallback."""

import logging
import os
from functools import lru_cache
from pathlib import Path

import boto3
from botocore.config import Config

from app.config import settings


logger = logging.getLogger("roommitra.object_storage")
REMOTE_UPLOAD_PREFIX = "neon-object://"
_STORAGE_ENV = (
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_ENDPOINT_URL_S3",
    "AWS_REGION",
)


def object_storage_enabled() -> bool:
    return all(os.getenv(name) for name in _STORAGE_ENV)


@lru_cache(maxsize=1)
def _s3_client():
    missing = [name for name in _STORAGE_ENV if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Neon Object Storage is not configured: missing {', '.join(missing)}")
    return boto3.client(
        "s3",
        endpoint_url=os.environ["AWS_ENDPOINT_URL_S3"],
        region_name=os.environ["AWS_REGION"],
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def save_upload(
    *,
    key: str,
    content: bytes,
    content_type: str,
    local_path: Path,
    local_url: str,
) -> str:
    if object_storage_enabled():
        _s3_client().put_object(
            Bucket=settings.object_storage_bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            CacheControl="private, max-age=3600",
        )
        return f"{REMOTE_UPLOAD_PREFIX}{key}"

    local_path.parent.mkdir(parents=True, exist_ok=True)
    local_path.write_bytes(content)
    return local_url


def resolve_upload_url(stored_value: str | None) -> str | None:
    if not stored_value:
        return None
    if not stored_value.startswith(REMOTE_UPLOAD_PREFIX):
        return stored_value
    key = stored_value.removeprefix(REMOTE_UPLOAD_PREFIX)
    return _s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.object_storage_bucket, "Key": key},
        ExpiresIn=7 * 24 * 60 * 60,
    )


def delete_upload(stored_value: str | None, local_directory: Path) -> None:
    if not stored_value:
        return
    if stored_value.startswith(REMOTE_UPLOAD_PREFIX):
        if not object_storage_enabled():
            logger.warning("Cannot delete remote upload because Neon storage is not configured")
            return
        try:
            _s3_client().delete_object(
                Bucket=settings.object_storage_bucket,
                Key=stored_value.removeprefix(REMOTE_UPLOAD_PREFIX),
            )
        except Exception as exc:  # Keep account/listing deletion successful; log orphan cleanup failures.
            logger.warning("Could not delete remote upload (%s)", type(exc).__name__)
        return

    local_name = Path(stored_value.split("?", 1)[0]).name
    if local_name:
        (local_directory / local_name).unlink(missing_ok=True)
