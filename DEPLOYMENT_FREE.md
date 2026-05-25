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

## 3. Deploy Frontend To Vercel

Create a Vercel project from the same repository:

- Root directory: `client`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

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

## 5. Limitations On Free Tiers

- Render free web services can sleep when idle, so the first request after inactivity may be slow.
- Vite requires `VITE_API_URL` during build, so changing it needs a Vercel redeploy.
- MongoDB Atlas M0 is suitable for demos and coursework, not heavy production traffic.
- Do not commit real `.env` files or secrets.
