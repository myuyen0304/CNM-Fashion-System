const express = require("express");
const router = express.Router();
const productController = require("./product.controller");
const {
  protect,
  requireRole,
} = require("../../shared/middleware/authMiddleware");
const upload = require("../../shared/middleware/upload");

// === PUBLIC routes ===
router.get("/popular", productController.getPopularProducts);
router.get("/categories", productController.getCategories);
router.get("/search", productController.searchByKeyword);
router.get("/filter", productController.filterProducts);
router.post(
  "/image-search",
  upload.single("image"),
  productController.imageSearch,
);
router.get("/:id", productController.getProductDetail);
router.get("/:id/similar", productController.getSimilarProducts);

// === ADMIN routes ===
router.get(
  "/",
  protect,
  requireRole("admin"),
  productController.getAllProducts,
);
router.post(
  "/",
  protect,
  requireRole("admin"),
  upload.array("images", 5),
  productController.createProduct,
);
router.put(
  "/:id",
  protect,
  requireRole("admin"),
  productController.updateProduct,
);
router.delete(
  "/:id",
  protect,
  requireRole("admin"),
  productController.deleteProduct,
);

module.exports = router;
