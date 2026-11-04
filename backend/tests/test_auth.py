import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
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
