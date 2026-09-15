# 🌾 Digital Farm Market

A full MERN-stack marketplace connecting **farmers** (sellers) and **traders** (buyers) directly, with OTP phone verification, multilingual UI (English + 5 South Indian languages), and a rural/farmland visual theme.

## Features

- Welcome page with Farmer / Trader role selection and language switcher
- Farmer: register/login (phone + OTP + password), forgot password via OTP, list crops by category, "My List" to view/remove own listings
- Trader: register/login (same system + required address), browse crop categories, view crop details incl. farmer's phone, add multiple crops to cart, "Click to Buy" with an animated truck delivery confirmation screen (no payment gateway)
- Categories stored in MongoDB (seed script provided) so they can be edited without touching the frontend
- Languages: English (default), हिन्दी, ಕನ್ನಡ, తెలుగు, தமிழ், മലയാളം — easy to add more via `frontend/src/i18n`
- 2Factor.in OTP integration point, read from environment variables (never hardcoded)

## Project Structure

```
digital-farm-market/
├── backend/     Node.js + Express + MongoDB API
└── frontend/    React + Vite client
```

## 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in:
- `MONGO_URI` — your local MongoDB or MongoDB Atlas connection string
- `JWT_SECRET` — any long random string
- `TWO_FACTOR_API_KEY` — your 2Factor.in API key (get one at https://2factor.in). **Never commit this.**

Seed the crop categories (run once):

```bash
npm run seed
```

Start the API:

```bash
npm run dev
```

The API runs on `http://localhost:5000` by default.

## 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The app runs on `http://localhost:5173` and proxies `/api` and `/uploads` requests to the backend.

## 3. How OTP Works

- `POST /api/auth/send-otp` calls 2Factor's `AUTOGEN` SMS endpoint and stores the returned `sessionId`.
- `POST /api/auth/verify-otp` calls 2Factor's `VERIFY` endpoint with the OTP the user typed.
- Only after a phone number is verified can `POST /api/auth/register` or `POST /api/auth/reset-password` succeed for that phone number.
- If `TWO_FACTOR_API_KEY` is missing/placeholder, OTP endpoints will return a clear error telling you to configure it — the rest of the app still works so you can build/test the UI first.

## 4. Adding a New Language

1. Create `frontend/src/i18n/locales/<code>.json` (copy `en.json` and translate the values).
2. Import it and add it to the `translations` and `languages` list in `frontend/src/i18n/index.js`.
3. If you want categories translated too, add the new language key to each category document in MongoDB (see `backend/seed/seedCategories.js`).

## 5. Crop Categories

Seeded categories (editable in MongoDB, no frontend changes needed):
Food Crops, Industrial & Technical Crops, Agronomic & Soil-Management Crops, Pulses/Legumes, Oilseed Crops, Ornamental & Landscaping Crops, Luxury/Non-food Stimulant Crops, Fruits, Vegetables.

## 6. Deployment Notes

### Option A — One-click with the included `render.yaml` blueprint

1. Create a MongoDB Atlas cluster (free tier is fine) and copy its connection string.
2. Push this whole folder to a new GitHub repository:
   ```bash
   cd digital-farm-market
   git init
   git add .
   git commit -m "Initial commit: Digital Farm Market"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. In the Render dashboard: **New → Blueprint**, connect the repo. Render reads `render.yaml` and creates both services automatically:
   - `farm-market-backend` (Node web service)
   - `farm-market-frontend` (static site)
4. Render will prompt you for the env vars marked `sync: false` — fill in:
   - Backend: `MONGO_URI` (from Atlas), `TWO_FACTOR_API_KEY`, `CLIENT_URL` (the frontend's Render URL, once known)
   - Frontend: `VITE_API_URL` (the backend's Render URL + `/api`)
5. Once both are live, update `CLIENT_URL` on the backend and redeploy so CORS allows the frontend's real URL.
6. Run the category seed once against your production database: `MONGO_URI=<atlas-uri> npm run seed` from the `backend` folder (locally, pointed at Atlas), or add it as a Render one-off job.

### Option B — Manual setup

- **Backend** → deploy to Render as a Node web service, set the same env vars from `.env.example` in the Render dashboard.
- **Frontend** → deploy to Render (static site) or Vercel/Netlify; set `VITE_API_URL` to your deployed backend URL + `/api`.
- **Database** → MongoDB Atlas free tier works fine; put its connection string in `MONGO_URI`.

### Notes either way

- Uploaded crop images are stored on the backend's local disk (`backend/uploads`). On Render's free tier this storage is ephemeral (cleared on redeploy) — for production, swap `multer.diskStorage` for a cloud storage adapter (e.g. Cloudinary or S3) if you need persistent images.
- Never commit real `.env` files — only `.env.example` files should be in git (already handled by `.gitignore`).

## 7. Security Notes

- `.env` files are git-ignored in both `backend/` and `frontend/`. Only commit the `.env.example` files.
- Never paste your real 2Factor API key into chat, code comments, or version control.
- Passwords are hashed with bcrypt before being stored; JWTs are used for session auth.

## 8. What's Not Included (by design, per your spec)

- No payment gateway — checkout ends with the animated "Thank you, your order is on the way" screen.
- No order status tracking (PLACED → DELIVERED) — just the delivery animation.
