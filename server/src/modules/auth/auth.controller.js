const authService = require("./auth.service");
const catchAsync = require("../../shared/utils/catchAsync");
const ApiError = require("../../shared/utils/ApiError");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const OTP_REGEX = /^\d{6}$/;
const REFRESH_TOKEN_COOKIE_NAME =
  process.env.REFRESH_TOKEN_COOKIE_NAME || "refreshToken";
const DEFAULT_REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const COMMON_DOMAIN_TYPOS = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "yahooo.com": "yahoo.com",
  "hotnail.com": "hotmail.com",
};

const getTypoSuggestion = (email) => {
  const domain = email.split("@")[1] || "";
  return COMMON_DOMAIN_TYPOS[domain] || "";
};

const parseDurationToMs = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value || "").trim().toLowerCase();
  const match = normalized.match(/^(\d+)(ms|s|m|h|d)?$/);

  if (!match) {
    return DEFAULT_REFRESH_COOKIE_MAX_AGE_MS;
  }

  const amount = Number(match[1]);
  const unit = match[2] || "ms";
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * (multipliers[unit] || 1);
};

const getRefreshCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
    maxAge: parseDurationToMs(process.env.JWT_REFRESH_EXPIRES_IN),
  };
};

const getRefreshTokenFromRequest = (req) => {
  const cookieHeader = String(req.headers?.cookie || "");
  const cookieValue = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));

  if (cookieValue) {
    return decodeURIComponent(cookieValue.split("=").slice(1).join("="));
  }

  return req.body?.refreshToken;
};

const register = catchAsync(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  // Validate đơn giản
  if (!name || !email || !password) {
    throw new ApiError(400, "Vui lòng nhập đầy đủ họ tên, email và mật khẩu.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  const typoSuggestion = getTypoSuggestion(email);
  if (typoSuggestion) {
    throw new ApiError(
      400,
      `Email có thể bị sai, bạn có muốn dùng ${typoSuggestion}?`,
    );
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw new ApiError(
      400,
      "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.",
    );
  }

  const result = await authService.register({ name, email, password });
  res.status(201).json({ success: true, ...result });
});

const login = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    throw new ApiError(400, "Vui lòng nhập email và mật khẩu.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  const typoSuggestion = getTypoSuggestion(email);
  if (typoSuggestion) {
    throw new ApiError(
      400,
      `Email có thể bị sai, bạn có muốn dùng ${typoSuggestion}?`,
    );
  }

  const result = await authService.login({ email, password });
  const { refreshToken, ...responsePayload } = result;
  res.cookie(
    REFRESH_TOKEN_COOKIE_NAME,
    refreshToken,
    getRefreshCookieOptions(),
  );
  res.json({ success: true, ...responsePayload });
});

const verifyRegistrationOtp = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const otp = String(req.body?.otp || "").trim();

  if (!email || !otp) {
    throw new ApiError(400, "Vui lòng nhập đầy đủ email và OTP.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  if (!OTP_REGEX.test(otp)) {
    throw new ApiError(400, "OTP phải gồm đúng 6 chữ số.");
  }

  const result = await authService.verifyRegistrationOtp({ email, otp });
  res.json({ success: true, ...result });
});

const resendRegistrationOtp = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw new ApiError(400, "Vui lòng nhập email.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  const result = await authService.resendRegistrationOtp(email);
  res.json({ success: true, ...result });
});

const verifyEmail = catchAsync(async (req, res) => {
  const token = String(req.params?.token || "").trim();

  if (!token) {
    throw new ApiError(400, "Thiếu token xác thực email.");
  }

  const result = await authService.verifyEmailLink(token);
  res.json({ success: true, ...result });
});

const forgotPassword = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    throw new ApiError(400, "Vui lòng nhập email.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  const result = await authService.forgotPassword(email);
  res.json({ success: true, ...result });
});

const resetPassword = catchAsync(async (req, res) => {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase();
  const otp = String(req.body?.otp || "").trim();
  const password = String(req.body?.password || "");

  if (!email || !otp || !password) {
    throw new ApiError(400, "Vui lòng nhập đầy đủ email, OTP và mật khẩu mới.");
  }

  if (!EMAIL_REGEX.test(email)) {
    throw new ApiError(400, "Email không đúng định dạng.");
  }

  if (!OTP_REGEX.test(otp)) {
    throw new ApiError(400, "OTP phải gồm đúng 6 chữ số.");
  }

  if (!PASSWORD_REGEX.test(password)) {
    throw new ApiError(
      400,
      "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.",
    );
  }

  const result = await authService.resetPassword({ email, otp, password });
  res.json({ success: true, ...result });
});

const refreshToken = catchAsync(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  const result = await authService.refreshAccessToken(refreshToken);
  if (refreshToken) {
    res.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      getRefreshCookieOptions(),
    );
  }
  res.json({ success: true, ...result });
});

const logout = catchAsync(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);
  const result = await authService.logout(refreshToken);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/auth",
  });
  res.json({ success: true, ...result });
});

module.exports = {
  register,
  login,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
};
