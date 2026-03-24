const orderService = require("./order.service");
const catchAsync = require("../../shared/utils/catchAsync");

const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  res.status(201).json({ success: true, data: order });
});

const getOrderHistory = catchAsync(async (req, res) => {
  const result = await orderService.getOrderHistory(
    req.user._id,
    parseInt(req.query.page, 10) || 1,
  );
  res.json({ success: true, data: result });
});

const getOrderDetail = catchAsync(async (req, res) => {
  const order = await orderService.getOrderDetail(req.params.id, req.user);
  res.json({ success: true, data: order });
});

const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user._id);
  res.json({ success: true, data: order, message: "Hủy đơn hàng thành công." });
});

const getAllOrdersForStaff = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const rawLimit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const limit = Math.min(rawLimit, 100);

  const data = await orderService.getAllOrdersForStaff({
    page,
    limit,
    status: req.query.status,
    paymentMethod: req.query.paymentMethod,
    from: req.query.from,
    to: req.query.to,
  });

  res.json({ success: true, data });
});

const updateOrderStatusByStaff = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderStatusByStaff(
    req.params.id,
    req.body.status,
  );
  res.json({ success: true, data: order });
});

const handleReturnRequestByEmployee = catchAsync(async (req, res) => {
  const order = await orderService.handleReturnRequestByEmployee(
    req.params.id,
    req.user,
    req.body,
  );
  res.json({ success: true, data: order });
});

const getRevenueSummary = catchAsync(async (req, res) => {
  const data = await orderService.getRevenueSummary({
    period: req.query.period,
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
});

module.exports = {
  createOrder,
  getOrderHistory,
  getOrderDetail,
  cancelOrder,
  getAllOrdersForStaff,
  updateOrderStatusByStaff,
  handleReturnRequestByEmployee,
  getRevenueSummary,
};

