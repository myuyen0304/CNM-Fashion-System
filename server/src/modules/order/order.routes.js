const express = require("express");
const router = express.Router();
const orderController = require("./order.controller");
const { requireRole } = require("../../shared/middleware/authMiddleware");
const { ROLES } = require("../../shared/constants");

// Staff routes
router.get(
  "/admin/list",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  orderController.getAllOrdersForStaff,
);
router.patch(
  "/:id/status",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  orderController.updateOrderStatusByStaff,
);
router.patch(
  "/:id/return",
  requireRole(ROLES.ADMIN, ROLES.EMPLOYEE),
  orderController.handleReturnRequestByEmployee,
);
router.get(
  "/admin/revenue-summary",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  orderController.getRevenueSummary,
);

// Customer routes
router.post("/", orderController.createOrder);
router.get("/", orderController.getOrderHistory);
router.get("/:id", orderController.getOrderDetail);
router.patch("/:id/cancel", orderController.cancelOrder);
router.put("/:id/cancel", orderController.cancelOrder);

module.exports = router;
