# RoomMitra

RoomMitra is a room and flatmate listing app built with React, FastAPI, and PostgreSQL.

## Features

- Indian mobile number OTP sign-in with local development delivery
- First-login setup for name, email, and preferred search city
- Create, search, edit, pause, mark filled, and save listings; filled homes stay visible with their status
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
