const paymentService = require("./payment.service");
const catchAsync = require("../../shared/utils/catchAsync");

/**
 * Tạo payment URL
 */
const initiatePayment = catchAsync(async (req, res) => {
  const { orderId, method } = req.body;

  // Lấy client IP từ request - convert IPv6 localhost ::1 thành 127.0.0.1
  let clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "127.0.0.1";

  // Normalize IPv6 loopback to IPv4
  if (clientIp === "::1" || clientIp === "::ffff:127.0.0.1") {
    clientIp = "127.0.0.1";
  }

  // PaymentMethod lấy từ order
  const result = await paymentService.initiatePayment(
    orderId,
    method,
    clientIp,
  );
  res.json({ success: true, data: result });
});

/**
 * VNPay callback (GET)
 */
const vnpayCallback = catchAsync(async (req, res) => {
  const result = await paymentService.handleVNPayCallback(req.query);

  // Redirect client tới payment result page
  const { TRANSACTION_STATUS } = require("../../shared/constants");

  if (result.status === TRANSACTION_STATUS.SUCCESS) {
    return res.redirect(
      `${process.env.CLIENT_URL}/payment/result?status=success&orderId=${req.query.vnp_TxnRef}`,
    );
  }

  res.redirect(
    `${process.env.CLIENT_URL}/payment/result?status=failed&orderId=${req.query.vnp_TxnRef}`,
  );
});

module.exports = { initiatePayment, vnpayCallback };
