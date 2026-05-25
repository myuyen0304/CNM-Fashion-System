# CNM Fashion System

CNM Fashion System là ứng dụng thương mại điện tử theo kiến trúc modular monolith, gồm frontend React và backend Express/MongoDB. Repository này bao phủ các luồng chính của storefront, quản lý tài khoản, giỏ hàng, đặt hàng, thanh toán VNPay, đánh giá sản phẩm, màn hình quản trị nhân sự và hệ thống chat hỗ trợ khách hàng theo thời gian thực.

## Công nghệ sử dụng

- Frontend: React 18, Vite, React Router, TailwindCSS, Axios, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO
- Tích hợp ngoài: Cloudinary, Nodemailer, VNPay, OpenAI SDK, Anthropic SDK, Google Generative AI SDK
- Kiểm thử: Node test runner cho backend, Vitest cho frontend

## Cấu trúc repository

```text
client/
  src/
    api/          Axios client và interceptors
    components/   UI dùng chung và route guards
    contexts/     State dùng chung cho auth và cart
    pages/        Các màn hình theo route
    utils/        Helper phía frontend

server/
  src/
    config/       Database, Cloudinary, Socket.IO
    modules/      auth, user, product, cart, order, payment, chat
    review/       Module đánh giá sản phẩm
    shared/       Middleware, constants, utilities
    app.js        Cấu hình Express app
    routes.js     Đăng ký route trung tâm
    server.js     Điểm khởi động tiến trình

docker/
postman/
docs/
```

## Tính năng chính

- Đăng ký, đăng nhập, refresh token, xác thực email, quên mật khẩu
- Duyệt sản phẩm, tìm kiếm, lọc, gợi ý sản phẩm, xem chi tiết
- Giỏ hàng và checkout
- Lịch sử đơn hàng, chi tiết đơn, hủy đơn, quản lý đơn cho staff
- Khởi tạo thanh toán và xử lý callback VNPay
- Đánh giá sản phẩm và tổng hợp điểm rating
- Chat hỗ trợ khách hàng với guest session, yêu cầu đăng nhập khi đụng dữ liệu nhạy cảm, và staff takeover
- Màn hình staff cho dashboard, sản phẩm, đơn hàng, người dùng và support chat

## Cấu trúc ứng dụng

Backend đi theo luồng phân lớp:

```text
routes -> controller -> service -> repository -> Mongoose model
```

Frontend tổ chức theo route page trong `client/src/pages`, UI dùng chung trong `client/src/components`, và state cấp ứng dụng qua `AuthContext` và `CartContext`.

Các entry point chính:

- Frontend: `client/src/main.jsx`, `client/src/App.jsx`
- Backend: `server/src/server.js`, `server/src/app.js`, `server/src/routes.js`

## Yêu cầu môi trường

- Node.js 18 trở lên
- npm
- MongoDB local hoặc MongoDB Atlas
- Tài khoản Cloudinary, SMTP, VNPay, AI provider nếu cần dùng các tích hợp tương ứng
- Docker Desktop nếu muốn chạy bằng Docker Compose

## Cấu hình biến môi trường

### Backend

Tạo `server/.env` từ `server/.env.example`.

Biến bắt buộc:

```env
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=http://localhost:5173
PORT=5000
```

Biến cho các tích hợp tùy chọn:

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

Tạo `client/.env` từ `client/.env.example`.

```env
VITE_API_URL=http://localhost:5000/api
```

## Chạy local

Cài dependencies:

```bash
npm install
npm --prefix server install
npm --prefix client install
```

Chạy backend:

```bash
cd server
npm run dev
```

Chạy frontend:

```bash
cd client
npm run dev
```

Địa chỉ mặc định:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## Truy cập khu vực quản trị

Khu vực quản trị dùng cùng màn hình đăng nhập với người dùng thường tại:

- `http://localhost:5173/login`

Sau khi đăng nhập, quyền truy cập được phân theo role:

- `admin`: vào được ` /staff`, `/staff/orders`, `/staff/support`, `/staff/products`, `/admin/users`
- `supervisor`: vào được ` /staff`, `/staff/orders`, `/staff/support`, `/staff/products`
- `employee`: vào được ` /staff`, `/staff/orders`, `/staff/support`

Nếu database chưa có tài khoản staff/admin, tạo bằng script backend:

```bash
cd server
npm run create:user -- --name="Admin CNM" --email=admin@example.com --password=StrongPass123 --role=admin
```

Có thể thay `--role=admin` bằng `supervisor` hoặc `employee`.

Lưu ý:

- Script này sẽ tạo mới hoặc cập nhật user nếu email đã tồn tại.
- User được tạo qua script sẽ được đặt `isActive = true` và `isVerified = true`.
- Màn quản lý người dùng chỉ mở cho role `admin`.

## Chạy bằng Docker

Repository có sẵn `docker-compose.yml` cho môi trường phát triển. Mặc định, container `server` sẽ đọc `MONGO_URI` trực tiếp từ `server/.env`, nên có thể dùng MongoDB Atlas hoặc MongoDB ngoài Docker.

Khởi động:

```bash
docker compose up --build
```

Endpoint mặc định:

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`

Nếu muốn chạy thêm MongoDB local trong Docker thay vì Atlas, dùng profile `local-db`:

```bash
docker compose --profile local-db up --build
```

Khi bật profile này, MongoDB local sẽ mở ở:

- MongoDB: `localhost:27018`

Dừng stack:

```bash
docker compose down
```

## Scripts

### Ở thư mục gốc

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

## Kiểm thử

Repository hiện đã có test tự động.

- `npm test` ở root sẽ chạy cả server và client
- Backend dùng Node built-in test runner
- Frontend dùng Vitest

Nếu cần test API thủ công, dùng collection trong thư mục `postman/`.

## Các nhóm API chính

- `/api/auth`
- `/api/users`
- `/api/products`
- `/api/cart`
- `/api/orders`
- `/api/payments`
- `/api/reviews`
- `/api/chat`

Ghi chú:

- `GET /api/health` dùng cho health check
- `/api/chat` cho phép guest truy cập qua optional auth; các thao tác liên quan đến đơn hàng, tài khoản hoặc dữ liệu cá nhân sẽ được kiểm soát ở tầng service

## Tài liệu liên quan

- `ARCHITECTURE.md`
- `DATABASE_ERD.md`
- `TEST_CASES.md`
- `DEPLOYMENT_FREE.md`
- `docs/`

## Ghi chú phát triển

- Frontend gọi API qua `client/src/api/axiosClient.js`
- Backend đăng ký route trong `server/src/routes.js`
- Module review hiện nằm ở `server/src/review` thay vì `server/src/modules`
- Docker development dùng bind mount cho source, nên phần lớn thay đổi ở backend/frontend sẽ tự reload mà không cần build lại toàn bộ image

## License

Repository hiện chưa có file license riêng. Nếu dự án được dùng ngoài phạm vi nội bộ hoặc coursework, nên bổ sung license rõ ràng.
