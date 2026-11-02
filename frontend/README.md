# RoomMitra frontend

## Run locally

1. Start the backend from `backend` with `uvicorn app.main:app --reload`.
2. In this folder, run `npm install` once, then `npm run dev`.
3. Open the Vite URL shown in the terminal (usually `http://localhost:5173`).

The frontend calls `http://127.0.0.1:8000` by default. To change it, set
`VITE_API_BASE_URL` in `.env.local` and restart the Vite server.

Run `npm run build` to create the production bundle in `dist/`.
