const ApiError = require("../../shared/utils/ApiError");
const {
  ORDER_STATUS,
  SHIPPING_METHODS,
  PAYMENT_METHODS,
} = require("../../shared/constants");
const orderRepo = require("./order.repository");
const cartRepo = require("../cart/cart.repository");
const Product = require("../product/product.model");
const productRepo = require("../product/product.repository");

/**
 * UC-06: Đặt hàng
 * Flow: validate cart → check stock → calc subtotal → input shipping → input method → confirm → create order
 */
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
    throw new ApiError(400, "Giỏ hàng bị trống.");
  }

  let normalizedShippingAddress = shippingAddress;
  let normalizedShippingPhone = shippingPhone;

  // Frontend hiện gửi shippingAddress dưới dạng object { fullName, phone, address, city }
  if (shippingAddress && typeof shippingAddress === "object") {
    const { fullName, phone, address, city } = shippingAddress;
    normalizedShippingPhone = shippingPhone || phone;
    normalizedShippingAddress = [fullName, address, city]
      .filter(Boolean)
      .join(", ");
  }

  if (!normalizedShippingAddress || !normalizedShippingPhone) {
    throw new ApiError(
      400,
      "Vui lòng nhập địa chỉ và số điện thoại giao hàng.",
    );
  }

  if (!Object.values(SHIPPING_METHODS).includes(shippingMethod)) {
    throw new ApiError(400, "Phương thức giao hàng không hợp lệ.");
  }

  const paymentInput = String(paymentMethod || "vnpay").toLowerCase();
  let normalizedPaymentMethod = PAYMENT_METHODS.VNPAY;
  if (paymentInput === "momo") {
    normalizedPaymentMethod = PAYMENT_METHODS.MOMO;
  } else if (paymentInput === "paypal") {
    normalizedPaymentMethod = PAYMENT_METHODS.PAYPAL;
  }

  // Kiểm tra tồn kho cho tất cả item
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      throw new ApiError(404, `Sản phẩm ${item.productId} không tồn tại.`);
    }
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Chỉ còn ${product.stock} "${product.name}" trong kho.`,
      );
    }
  }

  // Tính toán subtotal
  let subtotal = 0;
  items.forEach((item) => {
    subtotal += item.unitPrice * item.quantity;
  });

  // Tính phí giao hàng
  const shippingFee = shippingMethod === "express" ? 50000 : 20000; // VND
  const total = subtotal + shippingFee;

  // Tạo đơn hàng
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
  });

  // Giảm stock từng sản phẩm
  for (const item of items) {
    await productRepo.decreaseStock(item.productId, item.quantity);
  }

  return order;
};

/**
 * UC-08: Lịch sử đơn hàng
 */
const getOrderHistory = async (customerId, page = 1) => {
  return orderRepo.findOrdersByCustomer(customerId, page);
};

/**
 * Chi tiết đơn hàng
 */
const getOrderDetail = async (orderId, customerId) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.");
  }

  // Kiểm tra quyền (chỉ chủ nhân hoặc admin mới xem được)
  const ownerId =
    typeof order.customerId === "object" && order.customerId._id
      ? order.customerId._id.toString()
      : order.customerId.toString();
  if (ownerId !== customerId.toString()) {
    throw new ApiError(403, "Bạn không có quyền xem đơn hàng này.");
  }

  return order;
};

/**
 * Hủy đơn hàng (chỉ khi status = PENDING)
 */
const cancelOrder = async (orderId, customerId) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.");
  }

  const ownerId =
    typeof order.customerId === "object" && order.customerId._id
      ? order.customerId._id.toString()
      : order.customerId.toString();
  if (ownerId !== customerId.toString()) {
    throw new ApiError(403, "Bạn không có quyền hủy đơn hàng này.");
  }

  if (order.status !== ORDER_STATUS.PENDING) {
    throw new ApiError(
      400,
      'Chỉ có thể hủy đơn hàng trong trạng thái "Chờ thanh toán".',
    );
  }

  // Hoàn lại stock
  for (const item of order.items) {
    await productRepo.increaseStock(item.productId, item.quantity);
  }

  // Cập nhật status
  return orderRepo.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
};

module.exports = {
  createOrder,
  getOrderHistory,
  getOrderDetail,
  cancelOrder,
};
