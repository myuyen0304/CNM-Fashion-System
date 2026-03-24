// Roles
const ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  SUPERVISOR: "supervisor",
  EMPLOYEE: "employee",
};

// Order status
const ORDER_STATUS = {
  PENDING: "Ch? thanh toán",
  PAID: "Ðã thanh toán",
  SHIPPING: "Ðang giao",
  COMPLETED: "Hoàn t?t",
  CANCELLED: "H?y",
};

// Transaction status
const TRANSACTION_STATUS = {
  SUCCESS: "Thành công",
  CANCELLED: "Ðã h?y",
  FAILED: "Th?t b?i",
  EXPIRED: "H?t h?n",
};

// Return request status
const RETURN_STATUS = {
  NONE: "none",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
};

// Payment methods
const PAYMENT_METHODS = {
  VNPAY: "VNPay",
  MOMO: "MoMo",
  PAYPAL: "PayPal",
};

// Shipping methods
const SHIPPING_METHODS = {
  STANDARD: "standard",
  EXPRESS: "express",
};

// Product status
const PRODUCT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
};

// Chat sender roles
const SENDER_ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  BOT: "bot",
};

module.exports = {
  ROLES,
  ORDER_STATUS,
  TRANSACTION_STATUS,
  RETURN_STATUS,
  PAYMENT_METHODS,
  SHIPPING_METHODS,
  PRODUCT_STATUS,
  SENDER_ROLES,
};

