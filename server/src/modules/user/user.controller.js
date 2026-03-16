const userService = require("./user.service");
const catchAsync = require("../../shared/utils/catchAsync");

const getProfile = catchAsync(async (req, res) => {
  const user = await userService.getProfile(req.user._id);
  res.json({ success: true, data: user });
});

const updateProfile = catchAsync(async (req, res) => {
  const user = await userService.updateProfile(req.user._id, req.body);
  res.json({ success: true, data: user });
});

const updateAvatar = catchAsync(async (req, res) => {
  const user = await userService.updateAvatar(req.user._id, req.file);
  res.json({ success: true, data: user });
});

const changePassword = catchAsync(async (req, res) => {
  const result = await userService.changePassword(req.user._id, req.body);
  res.json({ success: true, ...result });
});

module.exports = { getProfile, updateProfile, updateAvatar, changePassword };
