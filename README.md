# CNM Fashion System

CNM Fashion System is a modular monolith e-commerce application with a React frontend and an Express/MongoDB backend. This repository covers the main storefront flows, account management, cart, ordering, VNPay payment, product reviews, staff administration screens, and real-time customer support chat.

## Tech Stack

- Frontend: React 18, Vite, React Router, TailwindCSS, Axios, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- External integrations: Cloudinary, Nodemailer, VNPay, OpenAI SDK, Anthropic SDK, Google Generative AI SDK
- Testing: Node test runner for the backend, Vitest for the frontend

## Repository Structure

```text
client/
  src/
    api/          Axios client and interceptors
    components/   Shared UI and route guards
    contexts/     Shared auth and cart state
    pages/        Route screens
    utils/        Frontend helpers

server/
  src/
    config/       Database, Cloudinary, Socket.IO
    modules/      auth, user, product, cart, order, payment, chat
    review/       Product review module
    shared/       Middleware, constants, utilities
    app.js        Express app configuration
    routes.js     Central route registration
    server.js     Process entry point

docker/
postman/
docs/
```

## Main Features

- Registration, login, refresh tokens, email verification, and password reset
- Product browsing, search, filtering, recommendations, and detail pages
- Cart and checkout
- Order history, order details, order cancellation, and staff order management
- VNPay payment initialization and callback handling
- Product reviews and rating aggregation
- Customer support chat with guest sessions, login requirements for sensitive data, and staff takeover
- Staff screens for dashboard, products, orders, users, and support chat

## Application Architecture

The backend follows a layered flow:

```text
routes -> controller -> service -> repository -> Mongoose model
```

The frontend is organized by route pages in `client/src/pages`, shared UI in `client/src/components`, and application-level state through `AuthContext` and `CartContext`.

Main entry points:

- Frontend: `client/src/main.jsx`, `client/src/App.jsx`
- Backend: `server/src/server.js`, `server/src/app.js`, `server/src/routes.js`

## Environment Requirements

- Node.js 18 or later
- npm
- Local MongoDB or MongoDB Atlas
- Cloudinary, SMTP, VNPay, and AI provider accounts if the corresponding integrations are needed
- Docker Desktop if you want to run the project with Docker Compose

## Environment Configuration

### Backend

Create `server/.env` from `server/.env.example`.

Required variables:

```env
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=http://localhost:5173
PORT=5000
```

Variables for optional integrations:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
DEEPSEEK_API_KEY=
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_URL=
VNPAY_RETURN_URL=
```

### Frontend

Create `client/.env` from `client/.env.example`.

```env
VITE_API_URL=http://localhost:5000/api
```

## Local Development

Install dependencies:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

Start the backend:

```bash
cd server
npm run dev
```

Start the frontend:

```bash
cd client
npm run dev
```

Default addresses:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Staff Area Access

The staff area uses the same login screen as regular users:

- `http://localhost:5173/login`

After login, access is controlled by role:

- `admin`: can access `/staff`, `/staff/orders`, `/staff/support`, `/staff/products`, `/admin/users`
- `supervisor`: can access `/staff`, `/staff/orders`, `/staff/support`, `/staff/products`
- `employee`: can access `/staff`, `/staff/orders`, `/staff/support`

If the database does not have a staff or admin account yet, create one with the backend script:

```bash
cd server
npm run create:user -- --name="Admin CNM" --email=admin@example.com --password=StrongPass123 --role=admin
```

You can replace `--role=admin` with `supervisor` or `employee`.

Notes:

- This script creates a new user or updates the user if the email already exists.
- Users created through the script are set to `isActive = true` and `isVerified = true`.
- The user management screen is available only to the `admin` role.

## Docker

The repository includes `docker-compose.yml` for development. By default, the `server` container reads `MONGO_URI` directly from `server/.env`, so it can use MongoDB Atlas or another MongoDB instance outside Docker.

Start the stack:

```bash
docker compose up --build
```

Default endpoints:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

To run a local MongoDB container instead of using Atlas, enable the `local-db` profile:

```bash
docker compose --profile local-db up --build
```

With this profile enabled, local MongoDB is exposed at:

- MongoDB: `localhost:27018`

Stop the stack:

```bash
docker compose down
```

## Scripts

### Root

```bash
npm test
```

### Backend

```bash
cd server
npm run dev
npm start
npm test
npm run test:watch
npm run import:csv
npm run create:user
```

### Frontend

```bash
cd client
npm run dev
npm run build
npm run preview
npm test
npm run test:watch
```

## Testing

This repository currently includes automated tests.

- `npm test` from the repository root runs both server and client tests
- The backend uses the Node built-in test runner
- The frontend uses Vitest

For manual API testing, use the collection in `postman/`.

## Main API Groups

- `/api/auth`
- `/api/users`
- `/api/products`
- `/api/cart`
- `/api/orders`
- `/api/payments`
- `/api/reviews`
- `/api/chat`

Notes:

- `GET /api/health` is used for health checks
- `/api/chat` allows guest access through optional authentication; operations involving orders, accounts, or personal data are controlled at the service layer

## Related Documentation

- `ARCHITECTURE.md`
- `DATABASE_ERD.md`
- `TEST_CASES.md`
- `DEPLOYMENT_FREE.md`
- `docs/`

## Development Notes

- The frontend calls the API through `client/src/api/axiosClient.js`
- The backend registers routes in `server/src/routes.js`
- The review module currently lives in `server/src/review` instead of `server/src/modules`
- Docker development uses bind mounts for source code, so most backend and frontend changes reload without rebuilding the full image

## License

This repository does not currently include a dedicated license file. If the project is used outside internal or coursework contexts, add an explicit license.
