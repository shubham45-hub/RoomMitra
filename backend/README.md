# RoomMitra backend

## Local setup (PowerShell)

1. Activate the backend virtual environment and install dependencies: `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env`; set the PostgreSQL URL and two independent random secrets (at least 32 characters outside development). Keep `.env` private.
3. Apply pending additive migrations: `alembic upgrade head`.
4. Start the API from `backend`: `uvicorn app.main:app --reload`.
5. Request a code with `POST /auth/otp/request` and JSON `{"phone":"9876543210"}`. In development, the code is logged by the backend. Verify with `POST /auth/otp/verify` and JSON `{"phone":"9876543210","code":"123456"}`.
6. Run unit tests with `pytest`.

Migrations preserve existing rows. Do not create or alter tables with SQLAlchemy `create_all`; use Alembic. Listing photos are stored locally under `uploads/` during development and are ignored by Git. Enquiries are stored in PostgreSQL, and the sender must consent to share their verified phone number before the lister can reply.

The SMS provider class is an integration seam only; production delivery must be implemented before setting `APP_ENV` outside development.
