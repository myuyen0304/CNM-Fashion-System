const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ApiError = require("../../shared/utils/ApiError");
const authRepo = require("./auth.repository");

const register = async ({ name, email, password }) => {
  const existingUser = await authRepo.findUserByEmail(email);
  if (existingUser) {
    throw new ApiError(
      409,
      "Email already exists, please use another email or login.",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await authRepo.createUser({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
  });

  return {
    message: "Register success. You can login now.",
  };
};

const login = async ({ email, password }) => {
  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (user.isActive === false) {
    throw new ApiError(403, "Account is deactivated.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

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
      isActive: user.isActive,
    },
  };
};

const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (_err) {
    throw new ApiError(401, "Refresh token is invalid or expired.");
  }

  const storedToken = await authRepo.findRefreshToken(refreshToken);
  if (!storedToken) {
    throw new ApiError(401, "Refresh token does not exist.");
  }

  const user = await authRepo.findUserById(decoded.userId);
  if (!user) {
    throw new ApiError(401, "Account does not exist.");
  }

  const accessToken = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" },
  );

  return { accessToken };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    await authRepo.deleteRefreshToken(refreshToken);
  }
  return { message: "Logout successful." };
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
