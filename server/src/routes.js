const { protect, requireRole } = require("./shared/middleware/authMiddleware");

// Import all route modules
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const productRoutes = require("./modules/product/product.routes");
const cartRoutes = require("./modules/cart/cart.routes");
const orderRoutes = require("./modules/order/order.routes");
const paymentRoutes = require("./modules/payment/payment.routes");
const reviewRoutes = require("./modules/review/review.routes");
const chatRoutes = require("./modules/chat/chat.routes");

/**
 * Central routes setup.
 * Gom tất cả module routes + apply middleware.
 */
const setupRoutes = (app) => {
  // === Public routes (no auth required) ===
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/payments", paymentRoutes); // Callback VNPay không cần auth

  // === Protected routes (require authentication) ===
  app.use("/api/users", protect, userRoutes);
  app.use("/api/cart", protect, cartRoutes);
  app.use("/api/orders", protect, orderRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/chat", protect, chatRoutes);
};

module.exports = setupRoutes;
