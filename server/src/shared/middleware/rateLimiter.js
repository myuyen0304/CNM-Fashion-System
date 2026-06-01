const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 1 phút.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều lần đăng ký. Vui lòng thử lại sau 1 phút.",
  },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 1 phút.",
  },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Quá nhiều lần xác thực OTP. Vui lòng thử lại sau 1 phút.",
  },
});

module.exports = {
  authLimiter,
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpLimiter,
};
