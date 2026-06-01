const mongoose = require("mongoose");
const ApiError = require("../../shared/utils/ApiError");
const {
  ORDER_STATUS,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  RETURN_STATUS,
  TRANSACTION_STATUS,
  INVENTORY_STATUS,
} = require("../../shared/constants");
const orderRepo = require("./order.repository");
const cartRepo = require("../cart/cart.repository");
const productRepo = require("../product/product.repository");

const STAFF_ROLES = ["admin", "supervisor", "employee"];

const getOrderOwnerId = (order) =>
  typeof order.customerId === "object" && order.customerId?._id
    ? order.customerId._id.toString()
    : order.customerId.toString();

const getInventoryStatus = (order) =>
  order.inventory?.status || INVENTORY_STATUS.RESERVED;

const withTransaction = async (work) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const assertInventoryCanBeReleased = (order, actionLabel) => {
  if (getInventoryStatus(order) === INVENTORY_STATUS.RELEASED) {
    throw new ApiError(
      400,
      `Tồn kho của đơn hàng này đã được hoàn lại trước đó, không thể ${actionLabel}.`,
    );
  }
};

const releaseInventoryForOrder = async (
  order,
  { session, reason, transactionReason } = {},
) => {
  assertInventoryCanBeReleased(order, "xử lý lại");

  for (const item of order.items) {
    await productRepo.increaseStock(item.productId, item.quantity, { session });
  }

  order.inventory = {
    status: INVENTORY_STATUS.RELEASED,
    releasedReason: reason || "",
    releasedAt: new Date(),
  };

  if (order.status !== ORDER_STATUS.CANCELLED) {
    order.status = ORDER_STATUS.CANCELLED;
  }

  if (transactionReason && order.transaction?.status === TRANSACTION_STATUS.SUCCESS) {
    order.transaction.status = TRANSACTION_STATUS.CANCELLED;
    order.transaction.reason = transactionReason;
  }
};

const buildReturnRequestState = (action, currentStatus, reason) => {
  if (action === "request") {
    if (!reason) {
      throw new ApiError(400, "Return reason is required.");
    }

    if (![RETURN_STATUS.NONE, RETURN_STATUS.REJECTED].includes(currentStatus)) {
      throw new ApiError(
        400,
        "Chỉ có thể tạo yêu cầu đổi trả mới khi chưa có yêu cầu đang mở hoặc yêu cầu trước đã bị từ chối.",
      );
    }

    return RETURN_STATUS.PENDING;
  }

  if (action === "approve" || action === "reject") {
    if (currentStatus !== RETURN_STATUS.PENDING) {
      throw new ApiError(400, "Yêu cầu đổi trả hiện không ở trạng thái chờ xử lý.");
    }

    return action === "approve" ? RETURN_STATUS.APPROVED : RETURN_STATUS.REJECTED;
  }

  if (action === "complete") {
    if (currentStatus !== RETURN_STATUS.APPROVED) {
      throw new ApiError(400, "Chỉ có thể hoàn tất đổi trả sau khi yêu cầu đã được duyệt.");
    }

    return RETURN_STATUS.COMPLETED;
  }

  throw new ApiError(400, "Invalid return action.");
};

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

  return withTransaction(async (session) => {
    const normalizedItems = [];

    for (const item of items) {
      const product = await productRepo.findById(item.productId, { session });
      if (!product) {
        throw new ApiError(404, `Product ${item.productId} does not exist.`);
      }

      if (product.stock < item.quantity) {
        throw new ApiError(
          400,
          `Only ${product.stock} units left for product "${product.name}".`,
        );
      }

      normalizedItems.push({
        productId: item.productId,
        name: product.name,
        imageUrl: item.imageUrl || product.images?.[0] || null,
        unitPrice: product.price,
        quantity: item.quantity,
        size: item.size,
      });
    }

    let subtotal = 0;
    for (const item of normalizedItems) {
      subtotal += item.unitPrice * item.quantity;
    }

    for (const item of normalizedItems) {
      const updated = await productRepo.decreaseStock(item.productId, item.quantity, {
        session,
      });

      if (!updated) {
        throw new ApiError(
          400,
          `Sản phẩm "${item.name || item.productId}" vừa hết hàng. Vui lòng thử lại.`,
        );
      }
    }

    const shippingFee =
      shippingMethod === SHIPPING_METHODS.EXPRESS ? 50000 : 20000;
    const total = subtotal + shippingFee;

    return orderRepo.createOrder(
      {
        customerId,
        items: normalizedItems,
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
        inventory: {
          status: INVENTORY_STATUS.RESERVED,
        },
      },
      { session },
    );
  });
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

  if (getOrderOwnerId(order) !== actorUser._id.toString()) {
    throw new ApiError(403, "You do not have permission to view this order.");
  }

  return order;
};

const cancelOrder = async (orderId, customerId) => {
  return withTransaction(async (session) => {
    const order = await orderRepo.findOrderById(orderId, {
      session,
      populateCustomer: false,
    });

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    if (getOrderOwnerId(order) !== customerId.toString()) {
      throw new ApiError(403, "You do not have permission to cancel this order.");
    }

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new ApiError(400, "Đơn hàng này đã bị hủy trước đó.");
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new ApiError(400, "Order can only be cancelled when pending payment.");
    }

    await releaseInventoryForOrder(order, {
      session,
      reason: "customer_cancelled",
    });

    return orderRepo.saveOrder(order, { session });
  });
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

  return withTransaction(async (session) => {
    const order = await orderRepo.findOrderById(orderId, {
      session,
      populateCustomer: false,
    });

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    if (status === ORDER_STATUS.CANCELLED) {
      if (order.status === ORDER_STATUS.CANCELLED) {
        throw new ApiError(400, "Đơn hàng này đã bị hủy trước đó.");
      }

      if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.PAID) {
        throw new ApiError(
          400,
          "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ thanh toán hoặc Đã thanh toán. Với đơn đang giao/hoàn tất, vui lòng dùng quy trình đổi trả.",
        );
      }

      await releaseInventoryForOrder(order, {
        session,
        reason: "staff_cancelled",
        transactionReason: "Đơn hàng bị hủy bởi nhân viên.",
      });

      return orderRepo.saveOrder(order, { session });
    }

    if (order.status === status) {
      return order;
    }

    order.status = status;
    return orderRepo.saveOrder(order, { session });
  });
};

const handleReturnRequestByEmployee = async (orderId, actorUser, payload) => {
  const action = String(payload.action || "").toLowerCase();
  const reason = String(payload.reason || "").trim();
  const note = String(payload.note || "").trim();

  return withTransaction(async (session) => {
    const order = await orderRepo.findOrderById(orderId, {
      session,
      populateCustomer: false,
    });

    if (!order) {
      throw new ApiError(404, "Order not found.");
    }

    if (action === "complete" && getInventoryStatus(order) === INVENTORY_STATUS.RELEASED) {
      assertInventoryCanBeReleased(order, "hoàn tất đổi trả");
    }

    const currentReturn = order.returnRequest || { status: RETURN_STATUS.NONE };
    const nextStatus = buildReturnRequestState(
      action,
      currentReturn.status,
      reason,
    );

    if (action === "complete") {
      assertInventoryCanBeReleased(order, "hoàn tất đổi trả");
      await releaseInventoryForOrder(order, {
        session,
        reason: "return_completed",
      });
    }

    order.returnRequest = {
      status: nextStatus,
      reason: reason || currentReturn.reason || "",
      note: note || currentReturn.note || "",
      handledBy: actorUser._id,
      updatedAt: new Date(),
    };

    return orderRepo.saveOrder(order, { session });
  });
};

const getRevenueSummary = async ({ period, from, to }) => {
  const normalizedPeriod = ["day", "week", "month", "year"].includes(period)
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

const getProductSalesSummary = async ({ period, from, to, limit }) => {
  const normalizedPeriod = ["day", "week", "month", "year"].includes(period)
    ? period
    : "day";

  const { rows, topProducts } = await orderRepo.aggregateProductSales({
    period: normalizedPeriod,
    from,
    to,
    limit,
  });

  const totalSold = rows.reduce((sum, row) => sum + (row.totalSold || 0), 0);
  const totalRevenue = rows.reduce(
    (sum, row) => sum + (row.totalRevenue || 0),
    0,
  );
  const totalOrders = rows.reduce((sum, row) => sum + (row.orderCount || 0), 0);

  return {
    period: normalizedPeriod,
    from: from || null,
    to: to || null,
    totalSold,
    totalRevenue,
    totalOrders,
    rows,
    topProducts,
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
  getProductSalesSummary,
};
