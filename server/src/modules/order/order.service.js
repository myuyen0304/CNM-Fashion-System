const ApiError = require("../../shared/utils/ApiError");
const {
  ORDER_STATUS,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  RETURN_STATUS,
  TRANSACTION_STATUS,
} = require("../../shared/constants");
const orderRepo = require("./order.repository");
const cartRepo = require("../cart/cart.repository");
const Product = require("../product/product.model");
const productRepo = require("../product/product.repository");

const STAFF_ROLES = ["admin", "supervisor", "employee"];

const createOrder = async (
  customerId,
  {
    items: requestItems,
    shippingAddress,
    shippingPhone,
    shippingMethod,
    paymentMethod,
  },
) => {
  const cart = await cartRepo.getCart(customerId);
  const cartItems = cart?.items || [];
  const items =
    cartItems.length > 0
      ? cartItems
      : Array.isArray(requestItems)
        ? requestItems
        : [];

  if (!items || items.length === 0) {
    throw new ApiError(400, "Cart is empty.");
  }

  let normalizedShippingAddress = shippingAddress;
  let normalizedShippingPhone = shippingPhone;

  if (shippingAddress && typeof shippingAddress === "object") {
    const { fullName, phone, address, city } = shippingAddress;
    normalizedShippingPhone = shippingPhone || phone;
    normalizedShippingAddress = [fullName, address, city]
      .filter(Boolean)
      .join(", ");
  }

  if (!normalizedShippingAddress || !normalizedShippingPhone) {
    throw new ApiError(400, "Shipping address and phone are required.");
  }

  if (!Object.values(SHIPPING_METHODS).includes(shippingMethod)) {
    throw new ApiError(400, "Invalid shipping method.");
  }

  const paymentInput = String(paymentMethod || "vnpay").toLowerCase();
  let normalizedPaymentMethod = PAYMENT_METHODS.VNPAY;
  if (paymentInput === "momo") {
    normalizedPaymentMethod = PAYMENT_METHODS.MOMO;
  } else if (paymentInput === "paypal") {
    normalizedPaymentMethod = PAYMENT_METHODS.PAYPAL;
  }

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(404, `Product ${item.productId} does not exist.`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Only ${product.stock} units left for product "${product.name}".`,
      );
    }
  }

  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.unitPrice * item.quantity;
  });

  const shippingFee = shippingMethod === "express" ? 50000 : 20000;
  const total = subtotal + shippingFee;

  const order = await orderRepo.createOrder({
    customerId,
    items,
    shippingAddress: normalizedShippingAddress,
    shippingPhone: normalizedShippingPhone,
    shippingMethod,
    paymentMethod: normalizedPaymentMethod,
    subtotal,
    shippingFee,
    total,
    status: ORDER_STATUS.PENDING,
    returnRequest: {
      status: RETURN_STATUS.NONE,
    },
  });

  for (const item of items) {
    await productRepo.decreaseStock(item.productId, item.quantity);
  }

  return order;
};

const getOrderHistory = async (customerId, page = 1) => {
  return orderRepo.findOrdersByCustomer(customerId, page);
};

const getOrderDetail = async (orderId, actorUser) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (STAFF_ROLES.includes(actorUser.role)) {
    return order;
  }

  const ownerId =
    typeof order.customerId === "object" && order.customerId._id
      ? order.customerId._id.toString()
      : order.customerId.toString();

  if (ownerId !== actorUser._id.toString()) {
    throw new ApiError(403, "You do not have permission to view this order.");
  }

  return order;
};

const cancelOrder = async (orderId, customerId) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  const ownerId =
    typeof order.customerId === "object" && order.customerId._id
      ? order.customerId._id.toString()
      : order.customerId.toString();
  if (ownerId !== customerId.toString()) {
    throw new ApiError(403, "You do not have permission to cancel this order.");
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new ApiError(400, "Order can only be cancelled when pending payment.");
  }

  for (const item of order.items) {
    await productRepo.increaseStock(item.productId, item.quantity);
  }

  return orderRepo.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
};

const getAllOrdersForStaff = async ({ page, limit, status, paymentMethod, from, to }) => {
  return orderRepo.findAllOrders({
    page,
    limit,
    status,
    paymentMethod,
    from,
    to,
  });
};

const updateOrderStatusByStaff = async (orderId, status) => {
  if (!Object.values(ORDER_STATUS).includes(status)) {
    throw new ApiError(400, "Invalid order status.");
  }

  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found.");
  }

  if (status === ORDER_STATUS.CANCELLED && order.status !== ORDER_STATUS.CANCELLED) {
    if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.PAID) {
      throw new ApiError(
        400,
        "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ thanh toán hoặc Đã thanh toán. Với đơn đang giao/hoàn tất, vui lòng dùng quy trình đổi trả.",
      );
    }

    for (const item of order.items) {
      await productRepo.increaseStock(item.productId, item.quantity);
    }

    if (order.transaction?.status === TRANSACTION_STATUS.SUCCESS) {
      await orderRepo.updateTransaction(orderId, {
        status: TRANSACTION_STATUS.CANCELLED,
        reason: "Đơn hàng bị hủy bởi nhân viên.",
      });
    }
  }

  return orderRepo.updateOrderStatus(orderId, status);
};

const handleReturnRequestByEmployee = async (orderId, actorUser, payload) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) throw new ApiError(404, "Order not found.");

  const action = String(payload.action || "").toLowerCase();
  const reason = String(payload.reason || "").trim();
  const note = String(payload.note || "").trim();

  const validActions = ["request", "approve", "reject", "complete"];
  if (!validActions.includes(action)) {
    throw new ApiError(400, "Invalid return action.");
  }

  const currentReturn = order.returnRequest || { status: RETURN_STATUS.NONE };
  let nextStatus = currentReturn.status;

  if (action === "request") nextStatus = RETURN_STATUS.PENDING;
  if (action === "approve") nextStatus = RETURN_STATUS.APPROVED;
  if (action === "reject") nextStatus = RETURN_STATUS.REJECTED;
  if (action === "complete") nextStatus = RETURN_STATUS.COMPLETED;

  if (action === "request" && !reason) {
    throw new ApiError(400, "Return reason is required.");
  }

  if (
    nextStatus === RETURN_STATUS.COMPLETED &&
    currentReturn.status !== RETURN_STATUS.COMPLETED
  ) {
    for (const item of order.items) {
      await productRepo.increaseStock(item.productId, item.quantity);
    }

    if (order.status !== ORDER_STATUS.CANCELLED) {
      await orderRepo.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
    }
  }

  const updated = await orderRepo.updateReturnRequest(orderId, {
    status: nextStatus,
    reason: reason || currentReturn.reason || "",
    note: note || currentReturn.note || "",
    handledBy: actorUser._id,
    updatedAt: new Date(),
  });

  return updated;
};

const getRevenueSummary = async ({ period, from, to }) => {
  const normalizedPeriod = ["day", "month", "year"].includes(period)
    ? period
    : "day";

  const rows = await orderRepo.aggregateRevenue({
    period: normalizedPeriod,
    from,
    to,
  });

  const totalRevenue = rows.reduce((sum, row) => sum + (row.totalRevenue || 0), 0);
  const totalOrders = rows.reduce((sum, row) => sum + (row.orderCount || 0), 0);

  return {
    period: normalizedPeriod,
    from: from || null,
    to: to || null,
    totalRevenue,
    totalOrders,
    rows,
  };
};

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
