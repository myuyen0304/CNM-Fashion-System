const { User } = require("../auth/auth.model");

const findById = async (id) => {
  return User.findById(id).select("-password");
};

const updateProfile = async (id, data) => {
  return User.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  }).select("-password");
};

const updateAvatar = async (id, avatarUrl) => {
  return User.findByIdAndUpdate(id, { avatarUrl }, { new: true }).select(
    "-password",
  );
};

const updatePassword = async (id, hashedPassword) => {
  return User.findByIdAndUpdate(id, { password: hashedPassword });
};

module.exports = {
  findById,
  updateProfile,
  updateAvatar,
  updatePassword,
};
