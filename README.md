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
