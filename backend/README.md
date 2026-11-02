# RoomMitra backend

## Local setup (PowerShell)

1. Activate the backend virtual environment and install dependencies: `pip install -r requirements.txt`.
2. Copy `.env.example` to `.env`; set the PostgreSQL URL and two independent random secrets (at least 32 characters outside development). Keep `.env` private.
3. Apply pending additive migrations: `alembic upgrade head`.
4. Start the API from `backend`: `uvicorn app.main:app --reload`.
5. Request a code with `POST /auth/otp/request` and JSON `{"phone":"9876543210"}`. In development, the code is logged by the backend. Verify with `POST /auth/otp/verify` and JSON `{"phone":"9876543210","code":"123456"}`.
6. Run unit tests with `pytest`.

After OTP verification, users complete their name, email, preferred city, sex, religion, and origin state once. They can optionally upload a profile picture. Browse and filter results use the saved city and show active listings from listers of the same sex; users can update their profile later. Profile pictures are stored locally under `uploads/profiles/` during development.

## Local listing moderation

Set `MODERATOR_PHONES` in `backend/.env` to the application owner's verified phone number in E.164 format (for example `+919876543210`). The owner sees the **Owner reports** page and reviews reports saved in PostgreSQL. This is an in-app review queue; it does not send email or SMS notifications. Users can report active listings from the listing details panel; the owner can mark reports in review, resolve or dismiss them, and pause a listing while resolving a report.

Listings are visible for 30 days after publication. When an owner opens the listings page during the final five days, an in-app pop-up lists soon-to-expire posts and offers a one-click renewal for another 30 days. Expired listings remain in the owner's **My listings** page and can still be renewed there. The expiry migration backfills existing listing rows from their original creation time; expired rows are hidden from public browse, saved listing, and contact endpoints until renewed. The reminder is in-app and does not send SMS or push notifications.

Owners can mark active or paused listings as filled from **My listings**. Filled listings stay visible in search with a **Filled** badge until they expire, but users cannot save or contact them. Owners can mark them available again or renew them if the expiry date has passed.

The owner's **Inquiries** button displays the unread count and refreshes it every 30 seconds while the listings page is open. Opening the inbox marks the displayed inquiries as read. Existing inquiries are marked read by the migration so only inquiries arriving after this feature is enabled show as new.

Each listing shows unique signed-in users who opened its details in the last rolling 24 hours. Reopening the same listing does not count the same user twice, and the listing owner is excluded from their own view count. Counts start at zero after the migration because historical view data was not recorded.

Each listing also shows its total unique contacts: users who sent an inquiry or clicked the lister's Call or WhatsApp link. A person is counted once per listing even if they use several contact methods. Existing inquiry senders are included in the migration backfill; earlier phone or WhatsApp clicks were not recorded and cannot be reconstructed.

Signed-in users can like or dislike listings they do not own. Each person has one reaction per listing; clicking the same reaction again removes it, and choosing the other reaction switches their vote. The listing owner sees both totals but cannot vote on their own listing.

Migrations preserve existing rows. Do not create or alter tables with SQLAlchemy `create_all`; use Alembic. Listing photos are stored locally under `uploads/` during development and are ignored by Git. Enquiries are stored in PostgreSQL, and the sender must consent to share their verified phone number before the lister can reply.

The SMS provider class is an integration seam only; production delivery must be implemented before setting `APP_ENV` outside development.
