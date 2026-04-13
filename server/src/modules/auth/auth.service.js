const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const ApiError = require("../../shared/utils/ApiError");
const authRepo = require("./auth.repository");
const {
  sendRegistrationOtpEmail,
  sendResetPasswordOtpEmail,
} = require("../../shared/services/emailService");

const OTP_PURPOSES = {
  REGISTER: "register_verification",
  RESET_PASSWORD: "password_reset",
};

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES || 10);
const OTP_RESEND_COOLDOWN_SECONDS = Number(
  process.env.OTP_RESEND_COOLDOWN_SECONDS || 60,
);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_MAX_RESENDS = Number(process.env.OTP_MAX_RESENDS || 5);
const EMAIL_VERIFY_LINK_EXPIRES_IN =
  process.env.EMAIL_VERIFY_LINK_EXPIRES_IN || "24h";

const normalizeEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
};

const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(crypto.randomInt(min, max + 1));
};

const createVerificationLinkToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      type: "email_verification",
    },
    process.env.JWT_SECRET,
    { expiresIn: EMAIL_VERIFY_LINK_EXPIRES_IN },
  );
};

const getOtpExpiryDate = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

const ensureOtpCanBeSent = (existingToken) => {
  if (!existingToken) {
    return 0;
  }

  if (existingToken.resendCount >= OTP_MAX_RESENDS) {
    throw new ApiError(
      429,
      "Bạn đã yêu cầu gửi lại OTP quá nhiều lần. Vui lòng thử lại sau.",
    );
  }

  const secondsSinceLastSend = Math.floor(
    (Date.now() - new Date(existingToken.lastSentAt).getTime()) / 1000,
  );

  if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
    throw new ApiError(
      429,
      `Vui lòng chờ ${OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend}s để gửi lại OTP.`,
    );
  }

  return existingToken.resendCount;
};

const verifyOtpRecord = async (otpRecord, otp) => {
  if (!otpRecord) {
    throw new ApiError(400, "OTP không hợp lệ hoặc đã hết hạn.");
  }

  if (new Date(otpRecord.expiresAt).getTime() < Date.now()) {
    throw new ApiError(400, "OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
  }

  if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "Bạn đã nhập sai OTP quá số lần cho phép. Vui lòng yêu cầu mã mới.",
    );
  }

  if (otpRecord.otpHash !== hashOtp(otp)) {
    await authRepo.incrementOtpAttempts(otpRecord._id);
    throw new ApiError(400, "OTP không chính xác.");
  }
};

const issueOtp = async ({ user, purpose }) => {
  const existingToken = await authRepo.findOtpToken(user.email, purpose);
  const currentResendCount = ensureOtpCanBeSent(existingToken);
  const otp = generateOtp();

  await authRepo.upsertOtpToken({
    userId: user._id,
    email: user.email,
    purpose,
    otpHash: hashOtp(otp),
    expiresAt: getOtpExpiryDate(),
    resendCount: currentResendCount + 1,
    lastSentAt: new Date(),
  });

  if (process.env.NODE_ENV === "development") {
    console.info(
      `[DEV OTP] purpose=${purpose} email=${user.email} otp=${otp} expiresIn=${OTP_EXPIRY_MINUTES}m`,
    );
  }

  return otp;
};

const register = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await authRepo.findUserByEmail(normalizedEmail);

  if (existingUser?.isActive === false) {
    throw new ApiError(403, "Tài khoản đã bị khóa.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  let user = existingUser;

  if (user && user.isVerified) {
    throw new ApiError(
      409,
      "Email đã tồn tại. Vui lòng đăng nhập hoặc dùng email khác.",
    );
  }

  if (user) {
    user = await authRepo.updateUser(user._id, {
      name,
      password: hashedPassword,
      isVerified: false,
    });
  } else {
    user = await authRepo.createUser({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: false,
    });
  }

  const otp = await issueOtp({
    user,
    purpose: OTP_PURPOSES.REGISTER,
  });
  const verifyToken = createVerificationLinkToken(user);

  await sendRegistrationOtpEmail(user.email, user.name, otp, verifyToken);

  return {
    message:
      "Đăng ký thành công. Vui lòng nhập OTP đã gửi đến email để xác thực tài khoản.",
    email: user.email,
    requiresVerification: true,
  };
};

const login = async ({ email, password }) => {
  const user = await authRepo.findUserByEmail(normalizeEmail(email));
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }
  if (user.isActive === false) {
    throw new ApiError(403, "Account is deactivated.");
  }
  if (!user.isVerified) {
    throw new ApiError(
      403,
      "Tài khoản chưa được xác thực. Vui lòng kiểm tra email để lấy OTP.",
    );
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
      isVerified: user.isVerified,
    },
  };
};

const verifyRegistrationOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản để xác thực.");
  }

  if (user.isVerified) {
    return { message: "Tài khoản đã được xác thực trước đó." };
  }

  const otpRecord = await authRepo.findOtpToken(
    normalizedEmail,
    OTP_PURPOSES.REGISTER,
  );

  await verifyOtpRecord(otpRecord, otp);
  await authRepo.updateUser(user._id, { isVerified: true });
  await authRepo.deleteOtpToken(normalizedEmail, OTP_PURPOSES.REGISTER);

  return { message: "Xác thực tài khoản thành công. Bạn có thể đăng nhập." };
};

const resendRegistrationOtp = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản.");
  }

  if (user.isVerified) {
    throw new ApiError(400, "Tài khoản này đã được xác thực.");
  }

  const otp = await issueOtp({
    user,
    purpose: OTP_PURPOSES.REGISTER,
  });
  const verifyToken = createVerificationLinkToken(user);

  await sendRegistrationOtpEmail(user.email, user.name, otp, verifyToken);

  return {
    message: "OTP xác thực mới đã được gửi đến email của bạn.",
    email: user.email,
  };
};

const verifyEmailLink = async (token) => {
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_err) {
    throw new ApiError(400, "Liên kết xác thực không hợp lệ hoặc đã hết hạn.");
  }

  if (decoded.type !== "email_verification") {
    throw new ApiError(400, "Liên kết xác thực không hợp lệ.");
  }

  const user = await authRepo.findUserById(decoded.userId);
  if (!user || user.email !== decoded.email) {
    throw new ApiError(404, "Không tìm thấy tài khoản cần xác thực.");
  }

  if (!user.isVerified) {
    await authRepo.updateUser(user._id, { isVerified: true });
  }

  await authRepo.deleteOtpToken(user.email, OTP_PURPOSES.REGISTER);

  return { message: "Email đã được xác thực thành công." };
};

const forgotPassword = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || !user.isVerified) {
    return {
      message:
        "Nếu email tồn tại trong hệ thống, OTP đặt lại mật khẩu sẽ được gửi trong ít phút.",
    };
  }

  const otp = await issueOtp({
    user,
    purpose: OTP_PURPOSES.RESET_PASSWORD,
  });

  await sendResetPasswordOtpEmail(user.email, user.name, otp);

  return {
    message:
      "Nếu email tồn tại trong hệ thống, OTP đặt lại mật khẩu sẽ được gửi trong ít phút.",
  };
};

const resetPassword = async ({ email, otp, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await authRepo.findUserByEmail(normalizedEmail);

  if (!user || !user.isActive || !user.isVerified) {
    throw new ApiError(400, "Thông tin đặt lại mật khẩu không hợp lệ.");
  }

  const otpRecord = await authRepo.findOtpToken(
    normalizedEmail,
    OTP_PURPOSES.RESET_PASSWORD,
  );

  await verifyOtpRecord(otpRecord, otp);

  const hashedPassword = await bcrypt.hash(password, 10);
  await authRepo.updatePassword(user._id, hashedPassword);
  await authRepo.deleteOtpToken(normalizedEmail, OTP_PURPOSES.RESET_PASSWORD);
  await authRepo.deleteAllRefreshTokens(user._id);

  return { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." };
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
  verifyRegistrationOtp,
  resendRegistrationOtp,
  verifyEmailLink,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logout,
};
