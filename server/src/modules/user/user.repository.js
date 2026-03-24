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

const findUsers = async ({ page = 1, limit = 20, role, keyword, isActive }) => {
  const skip = (page - 1) * limit;
  const filter = {};

  if (role) filter.role = role;
  if (typeof isActive === "boolean") filter.isActive = isActive;
  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { email: { $regex: keyword, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const updateUserRole = async (id, role) => {
  return User.findByIdAndUpdate(id, { role }, { new: true, runValidators: true })
    .select("-password");
};

const updateUserActiveStatus = async (id, isActive) => {
  return User.findByIdAndUpdate(
    id,
    { isActive },
    { new: true, runValidators: true },
  ).select("-password");
};

module.exports = {
  findById,
  updateProfile,
  updateAvatar,
  updatePassword,
  findUsers,
  updateUserRole,
  updateUserActiveStatus,
};

