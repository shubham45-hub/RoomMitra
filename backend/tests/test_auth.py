from dataclasses import replace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.config import settings
from app.routes import auth as auth_routes
from app.routes.auth import router


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    test_session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    app = FastAPI()
    app.include_router(router)

    def override_get_db():
        db = test_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_signup_and_signin_with_phone_and_password(client):
    signup = client.post(
        "/auth/signup",
        json={"name": "  Asha  ", "phone": "9876543210", "password": "a-secure-password"},
    )

    assert signup.status_code == 201
    created_user = signup.json()["user"]
    assert created_user["name"] == "Asha"
    assert created_user["phone"] == "+919876543210"
    assert "password" not in created_user

    signin = client.post(
        "/auth/signin",
        json={"phone": "+91 98765 43210", "password": "a-secure-password"},
    )

    assert signin.status_code == 200
    assert signin.json()["user"]["id"] == created_user["id"]
    assert signin.json()["access_token"]


def test_signup_rejects_duplicate_number_and_signin_rejects_wrong_password(client):
    payload = {"name": "Asha", "phone": "9876543210", "password": "a-secure-password"}
    assert client.post("/auth/signup", json=payload).status_code == 201
    assert client.post("/auth/signup", json=payload).status_code == 409

    signin = client.post(
        "/auth/signin",
        json={"phone": "9876543210", "password": "wrong-password"},
    )

    assert signin.status_code == 401


def test_password_reset_invalidates_older_codes_and_updates_password(client, monkeypatch):
    monkeypatch.setattr(
        auth_routes,
        "settings",
        replace(
            settings,
            app_env="development",
            password_reset_resend_seconds=0,
        ),
    )
    codes = iter((123456, 654321))
    monkeypatch.setattr(auth_routes.secrets, "randbelow", lambda _: next(codes))
    monkeypatch.setattr(auth_routes, "send_password_reset_code", lambda phone, code: None)
    signed_in = client.post(
        "/auth/signup",
        json={"name": "Asha", "phone": "9876543210", "password": "old-password"},
    )
    assert signed_in.status_code == 201

    first_request = client.post(
        "/auth/password-reset/request", json={"phone": "9876543210"}
    )
    second_request = client.post(
        "/auth/password-reset/request", json={"phone": "9876543210"}
    )
    assert first_request.status_code == 202
    assert second_request.status_code == 202
    assert first_request.json()["development_code"] == "123456"
    assert second_request.json()["development_code"] == "654321"

    old_code = client.post(
        "/auth/password-reset/confirm",
        json={
            "phone": "9876543210",
            "code": "123456",
            "new_password": "new-password",
        },
    )
    assert old_code.status_code == 400

    reset = client.post(
        "/auth/password-reset/confirm",
        json={
            "phone": "9876543210",
            "code": "654321",
            "new_password": "new-password",
        },
    )
    assert reset.status_code == 200
    assert client.post(
        "/auth/signin",
        json={"phone": "9876543210", "password": "old-password"},
    ).status_code == 401
    assert client.post(
        "/auth/signin",
        json={"phone": "9876543210", "password": "new-password"},
    ).status_code == 200
    assert client.post(
        "/auth/password-reset/confirm",
        json={
            "phone": "9876543210",
            "code": "654321",
            "new_password": "another-password",
        },
    ).status_code == 400
    assert client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {signed_in.json()['access_token']}"},
    ).status_code == 401


def test_password_reset_does_not_disclose_unknown_phone(client, monkeypatch):
    monkeypatch.setattr(
        auth_routes,
        "settings",
        replace(settings, app_env="production"),
    )
    assert client.post(
        "/auth/signup",
        json={"name": "Asha", "phone": "9876543210", "password": "old-password"},
    ).status_code == 201
    sent_to = []
    monkeypatch.setattr(
        auth_routes,
        "send_password_reset_code",
        lambda phone, code: sent_to.append(phone),
    )
    existing = client.post(
        "/auth/password-reset/request", json={"phone": "9876543210"}
    )
    unknown = client.post(
        "/auth/password-reset/request", json={"phone": "9876543211"}
    )

    assert existing.status_code == unknown.status_code == 202
    assert existing.json() == unknown.json()
    assert "development_code" not in existing.json()
    assert sent_to == ["+919876543210"]
