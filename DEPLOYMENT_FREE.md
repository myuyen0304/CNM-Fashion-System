# Free Deployment Guide

This project can run on free tiers with:

- Frontend: Vercel Hobby plan
- Backend: Render Free Web Service
- Database: MongoDB Atlas M0 Free cluster
- Images: Cloudinary Free plan

## 1. Prepare MongoDB Atlas

Create a free Atlas cluster, create a database user, allow network access, then copy the connection string.

Use this backend variable:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eshop?retryWrites=true&w=majority
```

## 2. Deploy Backend To Render

Use the root `render.yaml` blueprint, or create a Web Service manually:

- Root directory: `server`
- Runtime: `Node`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- Branch: `main` (or the branch you want to publish)
- Auto deploy: `On`

Required Render environment variables:

```env
NODE_ENV=production
MONGO_URI=<mongodb-atlas-connection-string>
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<long-random-secret>
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=https://<your-vercel-app>.vercel.app

CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<gmail-address>
EMAIL_PASSWORD=<gmail-app-password>
EMAIL_FROM=<gmail-address>

DEEPSEEK_API_KEY=<deepseek-key>

VNPAY_TMN_CODE=<sandbox-code>
VNPAY_HASH_SECRET=<sandbox-secret>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://<your-render-service>.onrender.com/api/payments/vnpay/callback
```

After Render deploys, test:

```text
https://<your-render-service>.onrender.com/api/health
```

Notes:

- `CLIENT_URL` must match the exact Vercel frontend origin that users open in the browser.
- This app uses cross-site refresh token cookies, so both frontend and backend should stay on HTTPS in production.
- Cloudinary is strongly recommended in production. If Cloudinary is missing, avatar uploads fall back to local files and generated URLs may not be suitable for internet-facing hosting.

## 3. Deploy Frontend To Vercel

Create a Vercel project from the same repository:

- Root directory: `client`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Production branch: `main` (or the branch you want to publish)

Set this Vercel environment variable:

```env
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

Redeploy the frontend after setting the variable because Vite reads `VITE_*` at build time.

## 4. Update Cross-Service URLs

After both services exist:

1. In Render, set `CLIENT_URL` to the Vercel frontend URL.
2. In Vercel, set `VITE_API_URL` to the Render backend API URL ending in `/api`.
3. In Render, set `VNPAY_RETURN_URL` to the Render backend callback URL.
4. Redeploy both services.

Recommended order:

1. Deploy the backend on Render first.
2. Copy the Render service URL.
3. Create the Vercel project and set `VITE_API_URL` with the Render URL ending in `/api`.
4. After Vercel gives you the frontend URL, paste it back into Render as `CLIENT_URL`.
5. Redeploy Render so CORS, email verification links, and payment redirects use the correct frontend domain.

## 5. Post-Deploy Smoke Test

Check these flows after both deployments are live:

1. Open the Vercel site and confirm the storefront loads without a blank page.
2. Call `GET https://<your-render-service>.onrender.com/api/health`.
3. Register a new account and confirm OTP or verification email still works.
4. Log in, refresh the page, and confirm the session survives page reload.
5. Open chat and confirm requests reach the backend.
6. Start a VNPay sandbox payment and verify the callback returns to the frontend result page.

## 6. Limitations On Free Tiers

- Render free web services can sleep when idle, so the first request after inactivity may be slow.
- Vite requires `VITE_API_URL` during build, so changing it needs a Vercel redeploy.
- MongoDB Atlas M0 is suitable for demos and coursework, not heavy production traffic.
- Do not commit real `.env` files or secrets.
