const express = require("express");
const router = express.Router();
const orderController = require("./order.controller");

router.post("/", orderController.createOrder);
router.get("/", orderController.getOrderHistory);
router.get("/:id", orderController.getOrderDetail);
router.put("/:id/cancel", orderController.cancelOrder);

module.exports = router;
