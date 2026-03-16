# E-Shop - Modular Monolith E-Commerce Platform

## 📋 Project Overview

A complete **Modular Monolith** e-commerce application built with:

- **Backend**: Node.js + Express.js + MongoDB
- **Frontend**: React 18 + TailwindCSS
- **Real-time**: Socket.io for Chat
- **Payment**: VNPay Integration

This implementation follows clean architecture principles with 8 independent domain modules.

## 🏗️ Architecture

### Modular Monolith Structure

```
server/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication & User Accounts
│   │   ├── user/          # User Profiles & Settings
│   │   ├── product/       # Product Catalog & Search
│   │   ├── cart/          # Shopping Cart
│   │   ├── order/         # Order Management
│   │   ├── payment/       # Payment Gateway Integration
│   │   ├── review/        # Product Reviews & Ratings
│   │   └── chat/          # Real-time Chat Support
│   ├── shared/            # Shared utilities, middleware, configs
│   ├── routes.js          # Central route aggregator
│   └── server.js          # App entry point

client/
├── src/
│   ├── pages/
│   │   ├── auth/          # Login, Register, Password Reset
│   │   ├── product/       # Home, Search, Product Detail
│   │   ├── cart/          # Shopping Cart
│   │   ├── order/         # Checkout, Order History, Detail
│   │   ├── profile/       # User Profile & Settings
│   │   ├── chat/          # Chat Interface
│   │   └── payment/       # Payment Result
│   ├── components/        # Reusable UI Components
│   ├── contexts/          # Global State (Auth, Cart)
│   ├── api/               # Axios Client with Interceptors
│   └── App.jsx            # Routing Setup
```

## 🚀 Quick Start

### Prerequisites

- Node.js 14+ and npm/yarn
- MongoDB running locally or Atlas connection
- Git

### Backend Setup

1. **Navigate to server directory**

   ```bash
   cd server
   npm install
   ```

2. **Create .env file** (copy from .env.example)

   ```bash
   cp .env.example .env
   ```

3. **Configure .env** with your credentials:

   ```
   MONGO_URI=mongodb://localhost:27017/eshop
   JWT_SECRET=your_secret_key
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   VNPAY_MERCHANT_ID=your_merchant_id
   VNPAY_HASH_SECRET=your_hash_secret
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_app_password
   PORT=5000
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   Server runs at `http://localhost:5000`

### Frontend Setup

1. **Navigate to client directory**

   ```bash
   cd client
   npm install
   ```

2. **Create .env file**

   ```
   VITE_API_URL=http://localhost:5000
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend runs at `http://localhost:5173`

## 📚 API Endpoints Summary

### Authentication (Public)

```
POST   /api/auth/register              Register new account
POST   /api/auth/verify                Verify email
POST   /api/auth/login                 Login
POST   /api/auth/refresh-token         Refresh access token
POST   /api/auth/logout                Logout
POST   /api/auth/forgot-password       Request password reset
POST   /api/auth/reset-password        Reset password
```

### Products (Public)

```
GET    /api/products/popular           Get popular products
GET    /api/products/search?q=...      Search by keyword
GET    /api/products/filter            Filter by criteria
GET    /api/products/:id               Get product detail
GET    /api/products/:id/similar       Get similar products
```

### User (Protected)

```
GET    /api/users/profile              Get user profile
PATCH  /api/users/profile              Update profile
PATCH  /api/users/profile/avatar       Upload avatar
PATCH  /api/users/password             Change password
```

### Cart (Protected)

```
GET    /api/cart                       Get cart
POST   /api/cart/items                 Add item
PATCH  /api/cart/items/:productId      Update item quantity
DELETE /api/cart/items/:productId      Remove item
DELETE /api/cart                       Clear cart
```

### Orders (Protected)

```
POST   /api/orders                     Create order
GET    /api/orders                     Get order history
GET    /api/orders/:id                 Get order detail
PATCH  /api/orders/:id/cancel          Cancel order
```

### Payment (Public)

```
POST   /api/payments/initiate          Initiate VNPay payment
GET    /api/payments/callback          VNPay callback
```

### Reviews (Protected)

```
POST   /api/reviews                    Create review
GET    /api/reviews/product/:id        Get product reviews
```

### Chat (Protected + Socket.io)

```
POST   /api/chat/room/:id              Get messages
POST   /api/chat/room/:id/message      Send message
Socket events:
  - joinRoom(roomId)
  - sendMessage(message)
  - newMessage (listen)
  - adminAssigned (listen)
```

## 🔑 Key Features

### Backend Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Email verification & password reset flow
- ✅ Product search (regex + text index + AI similarity)
- ✅ Shopping cart with stock validation
- ✅ Order management with status tracking
- ✅ VNPay payment gateway integration
- ✅ Product review system with rating aggregation
- ✅ Real-time chat with Socket.io
- ✅ Avatar upload to Cloudinary
- ✅ Comprehensive error handling

### Frontend Features

- ✅ Responsive design with TailwindCSS
- ✅ Protected routes with ProtectedRoute component
- ✅ Global auth/cart state with Context API
- ✅ Axios interceptors for JWT auto-refresh
- ✅ Form validation on all inputs
- ✅ Search, filter, and product discovery
- ✅ Multi-step checkout process
- ✅ Order history and review interface
- ✅ User profile management
- ✅ Real-time chat UI ready for Socket.io

## 📁 Frontend File Structure

```
client/src/
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── VerifyEmailPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   ├── product/
│   │   ├── HomePage.jsx
│   │   ├── SearchPage.jsx
│   │   └── ProductDetailPage.jsx
│   ├── cart/
│   │   └── CartPage.jsx
│   ├── order/
│   │   ├── CheckoutPage.jsx
│   │   ├── OrderHistoryPage.jsx
│   │   └── OrderDetailPage.jsx
│   ├── profile/
│   │   └── ProfilePage.jsx
│   ├── chat/
│   │   └── ChatPage.jsx
│   └── payment/
│       └── PaymentResultPage.jsx
├── components/
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── Layout.jsx
│   ├── ProtectedRoute.jsx
│   ├── LoadingSpinner.jsx
│   ├── StarRating.jsx
│   └── ProductCard.jsx
├── contexts/
│   ├── AuthContext.jsx
│   └── CartContext.jsx
├── api/
│   └── axiosClient.js
├── App.jsx
└── main.jsx
```

## 🔧 Technology Stack

### Backend

- Express.js - Web framework
- MongoDB + Mongoose - Database
- JWT - Authentication
- bcryptjs - Password hashing
- Nodemailer - Email service
- Multer - File upload
- Cloudinary - Image storage
- Socket.io - Real-time communication
- crypto - HMAC signature verification

### Frontend

- React 18 - UI library
- React Router v6 - Client-side routing
- Axios - HTTP client
- TailwindCSS - Utility-first CSS
- Vite - Build tool
- Context API - State management
- Socket.io Client - Real-time communication

## 🔐 Security Features

1. **Authentication**
   - JWT with access + refresh tokens
   - Bcrypt password hashing (10 salt rounds)
   - Token refresh on 401 response

2. **Authorization**
   - Role-based access control (middleware)
   - Protected routes on frontend
   - Protected endpoints on backend

3. **Data Validation**
   - Input validation on all endpoints
   - Mongoose schema validation
   - Frontend form validation

4. **Payment Security**
   - HMAC-SHA512 signature verification for VNPay
   - Callback validation

5. **File Upload**
   - File type validation (JPEG, PNG, WebP)
   - Size limit (5MB)
   - Cloudinary storage (not local)

## 📝 Common Development Tasks

### Add a New Product

```bash
# Use MongoDB CLI or compass to insert:
db.products.insertOne({
  name: "Sample Product",
  price: 100000,
  description: "...",
  category: "Electronics",
  images: ["https://..."],
  stock: 10
})
```

### Run Database Seed (if seed script exists)

```bash
cd server
npm run seed
```

### Test JWT Flow

1. Register at `/register`
2. Verify email via link
3. Login at `/login`
4. Token auto-stored in localStorage
5. Refresh happens automatically on 401

### E2E Flow Test

1. Browse products (HomePage)
2. Search products (SearchPage)
3. View product detail
4. Add to cart
5. Proceed to checkout
6. Make payment
7. View order history
8. Leave review

## 🐛 Debugging

### Backend Debugging

```bash
# Enable logging
NODE_ENV=development npm start

# Check MongoDB connection
mongosh mongodb://localhost:27017/eshop
```

### Frontend Debugging

```bash
# Check browser console for errors
# Check Network tab for API calls
# Check Application tab for localStorage tokens

# Access React DevTools Chrome extension
# Access Vite HMR in browser
```

### Common Issues

**"CORS error"**

- Check backend has CORS enabled
- Check VITE_API_URL in frontend .env

**"Token expired"**

- Clear localStorage and login again
- Check JWT_EXPIRE in backend .env

**"Image not uploading"**

- Check Cloudinary credentials
- Verify multer config
- Check file size < 5MB

**"Email not sending"**

- Enable "Less secure app access" on Gmail
- Use App Password for Gmail
- Check EMAIL_USER and EMAIL_PASSWORD in .env

## 📊 Project Statistics

- **Total Backend Files**: ~35 files
  - 8 domain modules × 5 files each = 40
  - +5 shared utilities
  - +1 central routes
  - = ~46 files

- **Total Frontend Files**: ~35 files
  - 9 domain pages
  - 7 shared components
  - 2 contexts
  - 1 API client
  - Config files (5)
  - = ~24 files

## 🎯 Next Steps

1. **Database Seeding**: Create sample products in MongoDB
2. **Testing**: Write unit tests for critical functions
3. **Documentation**: Create API documentation
4. **Deployment**: Deploy to Heroku/AWS/DigitalOcean
5. **Admin Panel**: Create admin CRUD interfaces
6. **Analytics**: Add product view/purchase analytics

## 📄 License

MIT License - See LICENSE file

## 👨‍💻 Author

Built as a learning project demonstrating modular monolith architecture for e-commerce.

---

**Happy Coding! 🚀**
