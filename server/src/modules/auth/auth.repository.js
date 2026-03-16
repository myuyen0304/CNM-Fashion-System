const { User, RefreshToken } = require("./auth.model");

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

const updatePassword = async (userId, hashedPassword) => {
  return User.findByIdAndUpdate(userId, { password: hashedPassword });
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

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  updatePassword,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllRefreshTokens,
};
