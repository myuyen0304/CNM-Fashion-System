const cartService = require("./cart.service");
const catchAsync = require("../../shared/utils/catchAsync");

const getCart = catchAsync(async (req, res) => {
  const cart = await cartService.getCart(req.user._id);
  res.json({ success: true, data: cart });
});

const addItem = catchAsync(async (req, res) => {
  const cart = await cartService.addItem(req.user._id, req.body);
  res.json({ success: true, data: cart });
});

const updateItem = catchAsync(async (req, res) => {
  const cart = await cartService.updateItem(req.user._id, req.body);
  res.json({ success: true, data: cart });
});

const removeItem = catchAsync(async (req, res) => {
  const cart = await cartService.removeItem(req.user._id, req.params.itemId);
  res.json({ success: true, data: cart });
});

const clearCart = catchAsync(async (req, res) => {
  await cartService.clearCart(req.user._id);
  res.json({ success: true, message: "Xóa giỏ hàng thành công." });
});

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
