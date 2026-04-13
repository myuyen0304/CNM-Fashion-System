const express = require("express");
const router = express.Router();
const productController = require("./product.controller");
const {
  protect,
  requireRole,
} = require("../../shared/middleware/authMiddleware");
const { ROLES } = require("../../shared/constants");
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
router.get("/recommendations", productController.getPublicRecommendations);
router.get(
  "/recommendations/me",
  protect,
  productController.getRecommendations,
);

// === Staff routes (admin + supervisor) ===
router.get(
  "/",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.getAllProducts,
);
router.get(
  "/admin/categories",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.getCategoryManagementList,
);
router.patch(
  "/admin/categories/rename",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.renameCategory,
);
router.delete(
  "/admin/categories/:name",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.deleteCategory,
);
router.post(
  "/",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  upload.array("images", 5),
  productController.createProduct,
);
router.put(
  "/:id",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.updateProduct,
);
router.patch(
  "/:id/stock",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.updateStock,
);
router.delete(
  "/:id",
  protect,
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR),
  productController.deleteProduct,
);

router.get("/:id", productController.getProductDetail);
router.get("/:id/similar", productController.getSimilarProducts);

module.exports = router;
