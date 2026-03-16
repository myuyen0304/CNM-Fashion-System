const orderService = require("./order.service");
const catchAsync = require("../../shared/utils/catchAsync");

const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  res.status(201).json({ success: true, data: order });
});

const getOrderHistory = catchAsync(async (req, res) => {
  const result = await orderService.getOrderHistory(
    req.user._id,
    parseInt(req.query.page) || 1,
  );
  res.json({ success: true, data: result });
});

const getOrderDetail = catchAsync(async (req, res) => {
  const order = await orderService.getOrderDetail(req.params.id, req.user._id);
  res.json({ success: true, data: order });
});

const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user._id);
  res.json({ success: true, data: order, message: "Hủy đơn hàng thành công." });
});

module.exports = { createOrder, getOrderHistory, getOrderDetail, cancelOrder };
