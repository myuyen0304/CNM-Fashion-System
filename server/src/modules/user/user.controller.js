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

const listUsers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const rawLimit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const limit = Math.min(rawLimit, 100);

  const isActive =
    req.query.isActive === undefined
      ? undefined
      : String(req.query.isActive).toLowerCase() === "true";

  const data = await userService.listUsers({
    page,
    limit,
    role: req.query.role,
    keyword: req.query.keyword,
    isActive,
  });

  res.json({ success: true, data });
});

const updateUserRole = catchAsync(async (req, res) => {
  const user = await userService.setUserRole(
    req.user,
    req.params.id,
    req.body.role,
  );
  res.json({ success: true, data: user });
});

const updateUserActiveStatus = catchAsync(async (req, res) => {
  const user = await userService.setUserActiveStatus(
    req.user,
    req.params.id,
    Boolean(req.body.isActive),
  );
  res.json({ success: true, data: user });
});

module.exports = {
  getProfile,
  updateProfile,
  updateAvatar,
  changePassword,
  listUsers,
  updateUserRole,
  updateUserActiveStatus,
};

