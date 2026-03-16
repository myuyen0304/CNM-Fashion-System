const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../../shared/utils/ApiError");
const authRepo = require("./auth.repository");

// ========================
// ĐĂNG KÝ
// ========================
const register = async ({ name, email, password }) => {
  // 1. Kiểm tra email đã tồn tại
  const existingUser = await authRepo.findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(
      409,
      "Email đã tồn tại, vui lòng sử dụng email khác hoặc đăng nhập.",
    );
  }

  // 2. Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 3. Tạo user (ngay tức thì có thể sử dụng)
  const user = await authRepo.createUser({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  return {
    message: "Đăng ký thành công. Bạn có thể đăng nhập ngay.",
  };
};

// ========================
// ĐĂNG NHẬP
// ========================
const login = async ({ email, password }) => {
  // 1. Tìm user
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Email hoặc mật khẩu không đúng.");
  }

  // 2. Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Email hoặc mật khẩu không đúng.");
  }

  // 3. Tạo tokens
  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" },
  );

  await authRepo.saveRefreshToken(user._id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
  };
};

// ========================
// REFRESH TOKEN
// ========================
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token không được cung cấp.");
  }

  // Verify refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new ApiError(401, "Refresh token không hợp lệ hoặc đã hết hạn.");
  }

  // Kiểm tra token có trong DB
  const storedToken = await authRepo.findRefreshToken(refreshToken);
  if (!storedToken) {
    throw new ApiError(401, "Refresh token không tồn tại.");
  }

  // Tạo access token mới
  const user = await authRepo.findUserById(decoded.userId);
  if (!user) {
    throw new ApiError(401, "Tài khoản không tồn tại.");
  }

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );

  return { accessToken };
};

// ========================
// ĐĂNG XUẤT
// ========================
const logout = async (refreshToken) => {
  if (refreshToken) {
    await authRepo.deleteRefreshToken(refreshToken);
  }
  return { message: "Đăng xuất thành công." };
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
