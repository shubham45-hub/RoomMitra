# RoomMitra

RoomMitra is a room and flatmate listing app built with React, FastAPI, and PostgreSQL.

## Features

- Indian mobile number OTP sign-in with local development delivery
- First-login setup for name, email, and preferred search city
- Create, search, edit, pause, mark filled, and save listings; filled homes stay visible with their status
- Let listers choose whether a room is for men, women, or anyone; matching users can browse and contact it
- Browse search results in pages with a load-more control
- Sort listings by newest or monthly rent
- Search listing titles and descriptions by keyword
- Show unique signed-in viewers per listing for the last 24 hours when listing details are opened
- Let signed-in users like or dislike listings and show totals
- Show how many unique users have contacted each lister
- Listings expire after 30 days, show owners a five-day reminder, and can be renewed
- Upload and browse room photos
- Send listing enquiries and contact listers by phone or WhatsApp
- Show owners an unread inquiry count and mark inquiries read when opening the inbox
- Report suspicious listings and review reports with moderator access
- Locality suggestions and rent/bed filters

## Local development

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for setup instructions. Copy `.env.example` to `.env` for local Docker credentials, and keep `.env` files private.
First-time OTP users complete their name, email, preferred city, sex, religion, and origin state in onboarding, with an optional profile picture. Listing browse is restricted to listers of the same sex as the signed-in user. These profile details can be changed from **My profile**.

## Public information and launch preparation

The frontend includes About, Privacy, Terms, and Copyright & reports pages, linked from the sign-in screen and listings footer. The privacy and terms copy is a starting draft based on the current features; it is **not legal advice or launch-ready legal approval**. Before inviting public users:

- Add the real operator/business name, monitored support and copyright-reporting contact, privacy contact, effective dates, and any locally required disclosures. Have the policies reviewed for the jurisdictions where RoomMitra will operate.
- Verify licenses/permissions for every photo, icon, font, map, illustration, and code sample. Keep a record of sources and license terms; replace assets whose rights are unclear.
- Configure production secrets, HTTPS, exact allowed frontend origins, PostgreSQL backups, persistent private photo storage, upload limits/scanning, and monitoring. Never deploy local `.env` credentials or development OTP output.
- Configure and verify production SMS delivery, sender/template requirements, delivery costs, and abuse controls. Run and review Alembic migrations against a backed-up production database; do not use `create_all` for production schema changes.
- Test sign-up, sign-in, profile deletion, listing/photo deletion, contact sharing, user reports, copyright reports, and moderation with production-like settings before launch.

Copyright notice: © 2026 RoomMitra. All rights reserved. Third-party materials remain subject to their owners' licenses and notices.

## Production deployment on a Docker host

The repository now includes production Dockerfiles, an Nginx SPA server, and a Caddy + PostgreSQL Compose stack. This is a single-host deployment baseline; the host and its persistent volumes still need backups and monitoring. It is not a one-click deployment to a managed hosting provider.

1. Provision a Docker host with persistent disk, point `roommitra.example.com` and `api.roommitra.example.com` DNS records to it, and allow inbound TCP ports 80 and 443 (UDP 443 is optional for HTTP/3).
2. Copy `deploy/.env.production.example` to the repository root as `.env.production`. Replace example domains with your real domains, set the exact frontend/API URLs and hosts, and enter production PostgreSQL and current SMS provider credentials. Generate independent long secrets for `JWT_SECRET_KEY` and `OTP_HMAC_SECRET`. Use an URL-safe random database password and use that same value in `DATABASE_URL`.
3. Back up any existing production database before applying migrations. From the repository root, run:

   ```powershell
   docker compose --env-file .env.production -f deploy/compose.production.yml up -d postgres
   docker compose --env-file .env.production -f deploy/compose.production.yml build api frontend
   docker compose --env-file .env.production -f deploy/compose.production.yml run --rm api alembic upgrade head
   docker compose --env-file .env.production -f deploy/compose.production.yml up -d
   docker compose --env-file .env.production -f deploy/compose.production.yml logs -f
   ```

   Migrations are run as an explicit release step; the API container does not run schema changes automatically. The Compose file keeps PostgreSQL data, uploaded photos, and Caddy certificates in named persistent volumes. Back up all three where needed, and do not use `docker compose down -v` on a live deployment.
4. Check `https://roommitra.example.com`, `https://api.roommitra.example.com/health`, and sign-in, uploads, account deletion, and moderation. Update the frontend image whenever `VITE_API_BASE_URL` changes because Vite embeds it at build time.

The sample values are placeholders. Production startup deliberately fails without exact CORS/host settings, strong secrets, and the already-configured production SMS provider credentials. Complete legal and asset review above before accepting public users.

## Free Vercel demo setup

For a friend-facing showcase that needs no backend, deploy only the frontend and share the generated URL with `?demo=1` added at the end (for example, `https://your-project.vercel.app/?demo=1`). This opens a standalone interactive preview with clearly labeled sample listings; search, save, and listing details work locally, while login and real contact are intentionally not connected. The normal site URL continues to use the existing app.

The frontend and API can be configured as two Vercel projects from the same GitHub repository:

- **Frontend project:** Root Directory `frontend`, build command `npm run build`, output `dist`, environment variable `VITE_API_BASE_URL` set to the API project's HTTPS URL.
- **API project:** Root Directory `backend`; `main.py` exports the FastAPI app for Vercel's Python runtime. Set `DATABASE_URL`, `APP_ENV`, `CORS_ORIGINS`, `ALLOWED_HOSTS`, `UPLOAD_DIR`, database pool values, and the other required backend environment variables in Vercel.
- Set `CORS_ORIGINS` to the exact frontend origin and `ALLOWED_HOSTS` to the API hostname. Rebuild the frontend when its API URL changes.

Vercel Functions have temporary local storage. The backend now stores profile and listing photos in the private Neon `assets` bucket when the `AWS_*` storage variables are configured; otherwise it falls back to local disk, which is temporary on Vercel. Alembic created RoomMitra's schema on Neon, but existing local user/listing rows were not copied. Transfer them before directing existing users there. The current OTP response exposes the development code when `APP_ENV=development`; this is for a private showcase only and does not prove phone ownership. Free plans have usage and retention limits, so treat this as a demo until backups and persistence are confirmed.
