# RoomMitra backend

## Local setup (PowerShell)

1. Activate the backend virtual environment and install dependencies: `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env`; set the PostgreSQL URL. Outside development, set independent random `JWT_SECRET_KEY` and `PASSWORD_RESET_HMAC_SECRET` values (at least 32 characters each), and configure Twilio for password recovery. Keep `.env` private.
3. Apply pending additive migrations: `alembic upgrade head`.
4. Start the API from `backend`: `uvicorn app.main:app --reload`.
5. Create an account with `POST /auth/signup` and JSON `{"name":"Your Name","phone":"9876543210","password":"at-least-8-characters"}`. Sign in with `POST /auth/signin` and JSON `{"phone":"9876543210","password":"at-least-8-characters"}`.
6. In development, request a recovery code with `POST /auth/password-reset/request` and `{"phone":"9876543210"}`; the response includes a development-only code. Confirm it with `POST /auth/password-reset/confirm` and `{"phone":"9876543210","code":"123456","new_password":"a-new-password"}`.
7. Run unit tests with `pytest`.

After signing up, users can complete their email, preferred city, sex, religion, and origin state once. They can optionally upload a profile picture. Browse and filter results use the saved city, while listing audience settings control gender matching; users can update their profile later. Without Neon Object Storage credentials, photos are stored locally under `uploads/` during development.

## Neon setup

The repository root contains `neon.ts` for the linked production branch. Run `neon deploy` there to apply the declared Neon Auth, private `assets` bucket, and `hello` Function. The CLI writes Neon-managed values to the root `.env`; backend configuration loads root `.env.local`, root `.env`, then `backend/.env` without overwriting values already set by the host. Keep these files private.

The API continues to use SQLAlchemy with psycopg 3. It reads the pooled `DATABASE_URL` for requests and uses `DATABASE_URL_UNPOOLED` for Alembic. A fresh database must be initialized with `python -m alembic upgrade head`; the baseline migration creates the original core tables before the additive feature migrations. Do not use `create_all` to update schema.

When the Neon `AWS_*` variables and `NEON_STORAGE_BUCKET=assets` are available, profile and listing photos use the private Neon Object Storage bucket. The API returns signed read URLs that expire after seven days and deletes uploaded objects when users remove images or accounts. Without those credentials, local development falls back to `UPLOAD_DIR`.

RoomMitra signs users up and in with an Indian mobile number and password. Passwords are stored as salted PBKDF2 hashes; production requires a `JWT_SECRET_KEY` of at least 32 characters. The Neon Auth service is provisioned on the branch but is not the app's sign-in provider. The deployed `hello` Function is a separate Neon service; the FastAPI API remains the app's REST backend.

Forgot-password recovery sends a short-lived, single-use SMS code to the account's mobile number. It is rate limited to five requests per hour, one send per minute, and five code attempts; production requires `SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and exactly one of `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID`. Configure `PASSWORD_RESET_HMAC_SECRET` separately from the JWT secret and keep both secrets private. `PASSWORD_RESET_SMS_TEMPLATE` must include `{code}`. Development returns the code in the response for local testing only. Recovery responses do not disclose whether a phone number has an account; a successful reset invalidates existing access tokens.

Each listing has an audience setting: men, women, or anyone. Browse, saved listings, listing details, and contact actions enforce this choice. The audience migration backfills old listings from the lister's sex to preserve their previous visibility where that profile detail exists; listings without it remain visible to anyone.

## Local listing moderation

Set `MODERATOR_PHONES` in `backend/.env` to the application owner's verified phone number in E.164 format (for example `+919876543210`). The owner sees the **Owner reports** page and reviews reports saved in PostgreSQL. This is an in-app review queue; it does not send email or SMS notifications. Users can report active listings from the listing details panel; the owner can mark reports in review, resolve or dismiss them, and pause a listing while resolving a report.

Listings are visible for 30 days after publication. When an owner opens the listings page during the final five days, an in-app pop-up lists soon-to-expire posts and offers a one-click renewal for another 30 days. Expired listings remain in the owner's **My listings** page and can still be renewed there. The expiry migration backfills existing listing rows from their original creation time; expired rows are hidden from public browse, saved listing, and contact endpoints until renewed. The reminder is in-app and does not send SMS or push notifications.

Owners can mark active or paused listings as filled from **My listings**. Filled listings stay visible in search with a **Filled** badge until they expire, but users cannot save or contact them. Owners can mark them available again or renew them if the expiry date has passed.

The owner's **Inquiries** button displays the unread count and refreshes it every 30 seconds while the listings page is open. Opening the inbox marks the displayed inquiries as read. Existing inquiries are marked read by the migration so only inquiries arriving after this feature is enabled show as new.

Each listing shows unique signed-in users who opened its details in the last rolling 24 hours. Reopening the same listing does not count the same user twice, and the listing owner is excluded from their own view count. Counts start at zero after the migration because historical view data was not recorded.

Each listing also shows its total unique contacts: users who sent an inquiry or clicked the lister's Call or WhatsApp link. A person is counted once per listing even if they use several contact methods. Existing inquiry senders are included in the migration backfill; earlier phone or WhatsApp clicks were not recorded and cannot be reconstructed.

Signed-in users can like or dislike listings they do not own. Each person has one reaction per listing; clicking the same reaction again removes it, and choosing the other reaction switches their vote. The listing owner sees both totals but cannot vote on their own listing.

Migrations preserve existing rows. Do not create or alter tables with SQLAlchemy `create_all`; use Alembic. Listing photos are stored locally under `uploads/` during development and are ignored by Git. Enquiries are stored in PostgreSQL, and the sender must consent to share their phone number before the lister can reply.

Listings support up to 12 photos each. The upload form groups them by hall, kitchen, washroom, bedroom, and other areas; existing listings' photos are kept and categorized as other areas when the photo-category migration is applied.

Each listing records whether its rent is per person or for the whole flat. For whole-flat rent, the app displays an approximate equal split across current residents and incoming flatmates.
