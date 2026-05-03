const crypto = require("crypto");
const ApiError = require("../../shared/utils/ApiError");
const {
  TRANSACTION_STATUS,
  ORDER_STATUS,
  PAYMENT_METHODS,
} = require("../../shared/constants");
const orderRepo = require("../order/order.repository");
const cartRepo = require("../cart/cart.repository");

const getVNPayConfig = () => {
  const config = {
    vnpUrl: process.env.VNPAY_URL || process.env.VNPAY_API_URL,
    tmnCode: process.env.VNPAY_TMN_CODE || process.env.VNPAY_MERCHANT_ID,
    secretKey: process.env.VNPAY_HASH_SECRET,
    returnUrl: process.env.VNPAY_RETURN_URL,
  };

  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new ApiError(
      500,
      `Thiếu cấu hình VNPay: ${missingKeys.join(", ")}. Vui lòng kiểm tra file .env.`,
    );
  }

  return config;
};

/**
 * Sort params theo key alphabetically, loại bỏ giá trị rỗng/null.
 * Trả về object với RAW values (không encode).
 *
 * NGUYÊN LÝ QUAN TRỌNG (VNPay-specific):
 * - VNPay tính HMAC trên query string đã URL-encode
 * - Dùng URLSearchParams để encode values
 * - HMAC và URL query string phải dùng CÙNG chuỗi encoded
 */
const sortVNPayParams = (params) => {
  const sorted = {};
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== "") {
        sorted[key] = String(value);
      }
    });
  return sorted;
};

/**
 * Helper: Restore UUID từ chuỗi 32 ký tự stripped
 * "550e8400e29b41d4a716446655440000" → "550e8400-e29b-41d4-a716-446655440000"
 */
const restoreUUID = (stripped) => {
  if (!stripped || stripped.length !== 32) return stripped;
  return [
    stripped.slice(0, 8),
    stripped.slice(8, 12),
    stripped.slice(12, 16),
    stripped.slice(16, 20),
    stripped.slice(20),
  ].join("-");
};

/**
 * Tạo URL thanh toán VNPay
 */
const createVNPayURL = (orderId, amount, orderInfo, clientIp) => {
  const { vnpUrl, tmnCode, secretKey, returnUrl } = getVNPayConfig();

  const date = new Date();
  const createDate =
    date.getFullYear() +
    ("0" + (date.getMonth() + 1)).slice(-2) +
    ("0" + date.getDate()).slice(-2) +
    ("0" + date.getHours()).slice(-2) +
    ("0" + date.getMinutes()).slice(-2) +
    ("0" + date.getSeconds()).slice(-2);

  const expireDate = new Date(date.getTime() + 15 * 60000);
  const expireString =
    expireDate.getFullYear() +
    ("0" + (expireDate.getMonth() + 1)).slice(-2) +
    ("0" + expireDate.getDate()).slice(-2) +
    ("0" + expireDate.getHours()).slice(-2) +
    ("0" + expireDate.getMinutes()).slice(-2) +
    ("0" + expireDate.getSeconds()).slice(-2);

  // FIX #1: Strip dấu gạch ngang khỏi UUID
  // VNPay chỉ chấp nhận [a-zA-Z0-9] cho vnp_TxnRef
  const txnRef = String(orderId).replace(/-/g, "");

  const vnpParams = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: "billpayment",
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: clientIp || "127.0.0.1",
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireString,
  };

  // BƯỚC 1: Sort params, giữ raw values
  const sortedParams = sortVNPayParams(vnpParams);

  // BƯỚC 2: Encode values rồi tính HMAC trên chuỗi ENCODED
  // VNPay server tính HMAC trên query string đã encode
  // → HMAC và URL phải cùng dùng encoded values
  const encodedQuery = new URLSearchParams(sortedParams).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(encodedQuery, "utf-8")).digest("hex");

  // BƯỚC 3: Build URL với ENCODED values (khớp với HMAC)
  const paymentUrl = `${vnpUrl}?${encodedQuery}&vnp_SecureHash=${signed}`;

  if (process.env.NODE_ENV === "development") {
    console.log("[VNPay] vnpParams:", JSON.stringify(vnpParams, null, 2));
    console.log("[VNPay] txnRef (stripped):", txnRef);
    console.log("[VNPay] signData (encoded):", encodedQuery);
    console.log("[VNPay] signature:", signed);
    console.log("[VNPay] Full URL:", paymentUrl);
  }

  return paymentUrl;
};

/**
 * Verify VNPay callback signature
 */
const verifyVNPaySignature = (vnpParams) => {
  const { secretKey } = getVNPayConfig();

  // FIX #3: Clone object trước khi delete, không mutate req.query gốc
  const params = { ...vnpParams };
  const vnpSecureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  // Express đã decode req.query → params chứa raw values
  // Cần re-encode để khớp với cách VNPay tính HMAC
  const sortedParams = sortVNPayParams(params);
  const encodedQuery = new URLSearchParams(sortedParams).toString();

  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(encodedQuery, "utf-8")).digest("hex");

  if (process.env.NODE_ENV === "development") {
    console.log("[VNPay Callback] signData (encoded):", encodedQuery);
    console.log("[VNPay Callback] computed:", signed);
    console.log("[VNPay Callback] received:", vnpSecureHash);
    console.log("[VNPay Callback] match:", signed === vnpSecureHash);
  }

  return signed === vnpSecureHash;
};

/**
 * Xử lý callback VNPay
 */
const handleVNPayCallback = async (vnpParams) => {
  if (!verifyVNPaySignature(vnpParams)) {
    throw new ApiError(400, "Chữ ký không hợp lệ.");
  }

  // vnp_TxnRef là UUID stripped → restore lại UUID gốc để query DB
  const txnRef = vnpParams.vnp_TxnRef;
  const orderId = restoreUUID(txnRef);
  const responseCode = vnpParams.vnp_ResponseCode;
  const transactionNo = vnpParams.vnp_TransactionNo;

  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.");
  }

  let transactionStatus = TRANSACTION_STATUS.FAILED;
  let orderStatus = ORDER_STATUS.PENDING;

  if (responseCode === "00") {
    transactionStatus = TRANSACTION_STATUS.SUCCESS;
    orderStatus = ORDER_STATUS.PAID;
  } else if (responseCode === "24") {
    transactionStatus = TRANSACTION_STATUS.CANCELLED;
  } else if (responseCode === "99") {
    transactionStatus = TRANSACTION_STATUS.EXPIRED;
  }

  await orderRepo.updateTransaction(orderId, {
    transactionId: transactionNo,
    method: PAYMENT_METHODS.VNPAY,
    status: transactionStatus,
    reason: vnpParams.vnp_Message || "",
  });

  if (orderStatus !== ORDER_STATUS.PENDING) {
    await orderRepo.updateOrderStatus(orderId, orderStatus);

    if (orderStatus === ORDER_STATUS.PAID || orderStatus === ORDER_STATUS.COMPLETED) {
      await cartRepo.clearCart(order.customerId);
    }
  }

  return { success: true, status: transactionStatus };
};

/**
 * Tạo payment request
 */
const initiatePayment = async (orderId, paymentMethod, clientIp, userId) => {
  const order = await orderRepo.findOrderById(orderId);
  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.");
  }

  const ownerId = order.customerId?._id ?? order.customerId;
  if (String(ownerId) !== String(userId)) {
    throw new ApiError(403, "Bạn không có quyền thanh toán đơn hàng này.");
  }

  if (!order.total || order.total <= 0) {
    throw new ApiError(400, "Đơn hàng không có thành tiền hợp lệ.");
  }

  const methodInput = String(paymentMethod || order.paymentMethod || "");
  let normalizedMethod = methodInput;

  if (methodInput.toLowerCase() === "vnpay") {
    normalizedMethod = PAYMENT_METHODS.VNPAY;
  } else if (methodInput.toLowerCase() === "momo") {
    normalizedMethod = PAYMENT_METHODS.MOMO;
  } else if (methodInput.toLowerCase() === "paypal") {
    normalizedMethod = PAYMENT_METHODS.PAYPAL;
  }

  if (normalizedMethod === PAYMENT_METHODS.VNPAY) {
    const paymentUrl = createVNPayURL(
      orderId,
      order.total,
      "Thanh-toan-don-hang",
      clientIp,
    );
    return { paymentUrl, method: PAYMENT_METHODS.VNPAY };
  }

  throw new ApiError(400, "Phương thức thanh toán chưa hỗ trợ.");
};

module.exports = {
  initiatePayment,
  handleVNPayCallback,
  verifyVNPaySignature,
};
