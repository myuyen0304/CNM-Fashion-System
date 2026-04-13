const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const ApiError = require("../../shared/utils/ApiError");
const { ROLES } = require("../../shared/constants");
const {
  isCloudinaryConfigured,
  uploadToCloudinary,
} = require("../../config/cloudinary");
const userRepo = require("./user.repository");

const AVATAR_PUBLIC_PATH = "/uploads/avatars/";
const AVATARS_DIR = path.join(__dirname, "../../../uploads/avatars");

const saveAvatarToLocal = async (file, userId) => {
  await fs.promises.mkdir(AVATARS_DIR, { recursive: true });

  const extByMime = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const ext = extByMime[file.mimetype] || "jpg";
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const fullPath = path.join(AVATARS_DIR, fileName);

  await fs.promises.writeFile(fullPath, file.buffer);

  const serverUrl = `http://localhost:${process.env.PORT || 5000}`;
  return `${serverUrl}${AVATAR_PUBLIC_PATH}${fileName}`;
};

const getLocalAvatarFilePath = (avatarUrl) => {
  if (!avatarUrl || typeof avatarUrl !== "string") return null;

  const markerIndex = avatarUrl.indexOf(AVATAR_PUBLIC_PATH);
  if (markerIndex === -1) return null;

  const relativePath = avatarUrl.slice(markerIndex + AVATAR_PUBLIC_PATH.length);
  const fileName = path.basename(relativePath);
  if (!fileName) return null;

  return path.join(AVATARS_DIR, fileName);
};

const cleanupOldLocalAvatar = async (oldAvatarUrl, newAvatarUrl) => {
  if (!oldAvatarUrl || oldAvatarUrl === newAvatarUrl) return;

  const oldAvatarFile = getLocalAvatarFilePath(oldAvatarUrl);
  if (!oldAvatarFile) return;

  try {
    await fs.promises.unlink(oldAvatarFile);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Cannot delete old avatar:", error.message);
    }
  }
};

const getProfile = async (userId) => {
  const user = await userRepo.findById(userId);
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");
  return user;
};

const updateProfile = async (userId, { name }) => {
  if (!name || !name.trim()) {
    throw new ApiError(400, "Tên không được để trống.");
  }

  const user = await userRepo.updateProfile(userId, { name: name.trim() });
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");
  return user;
};

const updateAvatar = async (userId, file) => {
  if (!file) throw new ApiError(400, "Vui lòng chọn ảnh.");

  const currentUser = await userRepo.findById(userId);
  if (!currentUser) throw new ApiError(404, "Không tìm thấy tài khoản.");

  const oldAvatarUrl = currentUser.avatarUrl || currentUser.avatar || "";

  let avatarUrl;

  if (isCloudinaryConfigured()) {
    try {
      avatarUrl = await uploadToCloudinary(file.buffer, "ecommerce/avatars");
    } catch (error) {
      console.error("Cloudinary avatar upload failed:", error.message);
      throw new ApiError(500, "Upload ảnh lên Cloudinary thất bại.");
    }
  } else {
    avatarUrl = await saveAvatarToLocal(file, userId);
  }

  const user = await userRepo.updateAvatar(userId, avatarUrl);
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");

  await cleanupOldLocalAvatar(oldAvatarUrl, avatarUrl);

  return user;
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.");
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, "Mật khẩu mới phải có ít nhất 6 ký tự.");
  }

  const { User } = require("../auth/auth.model");
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new ApiError(400, "Mật khẩu hiện tại không đúng.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await userRepo.updatePassword(userId, hashedPassword);

  return { message: "Đổi mật khẩu thành công." };
};

const listUsers = async ({ page, limit, role, keyword, isActive }) => {
  return userRepo.findUsers({ page, limit, role, keyword, isActive });
};

const setUserRole = async (actorUser, targetUserId, role) => {
  if (!Object.values(ROLES).includes(role)) {
    throw new ApiError(400, "Role không hợp lệ.");
  }

  if (
    targetUserId.toString() === actorUser._id.toString() &&
    role !== ROLES.ADMIN
  ) {
    throw new ApiError(400, "Admin không thể tự hạ quyền của chính mình.");
  }

  const user = await userRepo.updateUserRole(targetUserId, role);
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");
  return user;
};

const setUserActiveStatus = async (actorUser, targetUserId, isActive) => {
  if (
    targetUserId.toString() === actorUser._id.toString() &&
    isActive === false
  ) {
    throw new ApiError(
      400,
      "Admin không thể tự khóa tài khoản của chính mình.",
    );
  }

  const user = await userRepo.updateUserActiveStatus(targetUserId, isActive);
  if (!user) throw new ApiError(404, "Không tìm thấy tài khoản.");
  return user;
};

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  listUsers,
  setUserRole,
  setUserActiveStatus,
};
