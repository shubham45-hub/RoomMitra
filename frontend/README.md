# RoomMitra frontend

## Run locally

1. Start the backend from `backend` with `uvicorn app.main:app --reload`.
2. In this folder, run `npm install` once, then `npm run dev`.
3. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The frontend calls `http://127.0.0.1:8000` by default. To change it, set
`VITE_API_BASE_URL` in `.env.local` and restart the Vite server.

## Deploying the frontend to Vercel or Netlify

The frontend is a static Vite application. Both host-specific SPA fallback files are included: `vercel.json` and `public/_redirects`.

- Import the GitHub repository into Vercel or Netlify and set the project/base directory to `frontend`.
- Use `npm run build` as the build command and `dist` as the output directory.
- Set the build environment variable `VITE_API_BASE_URL` to the public HTTPS URL of the separately deployed FastAPI API, for example `https://api.example.com`. Vite embeds this value into the frontend at build time; redeploy after changing it.
- On the backend, set `CORS_ORIGINS` to the exact deployed frontend origin (for example `https://roommitra.vercel.app`) and `ALLOWED_HOSTS` to the API hostname.

Vercel and Netlify will host the React frontend; they do not automatically host the PostgreSQL database, durable uploaded photos, or the FastAPI service as part of this static-site setup. Select a separate backend/database/photo-storage host that provides persistent storage before public launch. Do not use a backend filesystem or database plan that discards user uploads or expires production data.

Run `npm run build` to create the production bundle in `dist/`.
