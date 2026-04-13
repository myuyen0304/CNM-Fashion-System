const { User, RefreshToken, OtpToken } = require("./auth.model");

// ========================
// USER queries
// ========================

const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

const findUserById = async (id) => {
  return User.findById(id);
};

const createUser = async (userData) => {
  const user = new User(userData);
  return user.save();
};

const updateUser = async (userId, updates) => {
  return User.findByIdAndUpdate(userId, updates, { new: true });
};

const updatePassword = async (userId, hashedPassword) => {
  return User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true },
  );
};

// ========================
// REFRESH TOKEN queries
// ========================

const saveRefreshToken = async (userId, token) => {
  return RefreshToken.create({ userId, token });
};

const findRefreshToken = async (token) => {
  return RefreshToken.findOne({ token });
};

const deleteRefreshToken = async (token) => {
  return RefreshToken.deleteOne({ token });
};

const deleteAllRefreshTokens = async (userId) => {
  return RefreshToken.deleteMany({ userId });
};

// ========================
// OTP TOKEN queries
// ========================

const findOtpToken = async (email, purpose) => {
  return OtpToken.findOne({ email: email.toLowerCase(), purpose });
};

const upsertOtpToken = async ({
  userId,
  email,
  purpose,
  otpHash,
  expiresAt,
  resendCount,
  lastSentAt,
}) => {
  return OtpToken.findOneAndUpdate(
    { email: email.toLowerCase(), purpose },
    {
      userId,
      email: email.toLowerCase(),
      purpose,
      otpHash,
      expiresAt,
      attempts: 0,
      resendCount,
      lastSentAt,
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );
};

const incrementOtpAttempts = async (otpTokenId) => {
  return OtpToken.findByIdAndUpdate(
    otpTokenId,
    { $inc: { attempts: 1 } },
    { new: true },
  );
};

const deleteOtpToken = async (email, purpose) => {
  return OtpToken.deleteOne({ email: email.toLowerCase(), purpose });
};

const deleteOtpTokensByUser = async (userId, purpose) => {
  return OtpToken.deleteMany({ userId, purpose });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updateUser,
  updatePassword,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
  findOtpToken,
  upsertOtpToken,
  incrementOtpAttempts,
  deleteOtpToken,
  deleteOtpTokensByUser,
};
