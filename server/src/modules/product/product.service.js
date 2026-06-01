const ApiError = require("../../shared/utils/ApiError");
const { escapeRegex } = require("../../shared/utils/normalize");
const {
  extractFeatures,
  cosineSimilarity,
} = require("../../shared/services/aiService");
const { uploadToCloudinary } = require("../../config/cloudinary");
const productRepo = require("./product.repository");
const orderRepo = require("../order/order.repository");
const reviewRepo = require("../../review/review.repository");

const normalizeLimit = (limit, fallback = 8, max = 24) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.max(1, Math.floor(parsed)), max);
};

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return String(value._id);
  return String(value);
};

const getMapMax = (map) => {
  let max = 0;
  for (const value of map.values()) {
    if (value > max) max = value;
  }
  return max || 1;
};

const calculateRecencyBoost = (createdAt) => {
  if (!createdAt) return 0;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;

  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 14) return 1;
  if (ageDays <= 60) return 0.7;
  if (ageDays <= 180) return 0.4;
  return 0.15;
};

/**
 * UC-01: Tìm kiếm sản phẩm bằng từ khóa
 */
const search = async (keyword, criteria, page) => {
  if (!keyword || !keyword.trim()) {
    throw new ApiError(400, "Vui lòng nhập từ khóa tìm kiếm.");
  }

  const rawKeyword = keyword.trim();
  const escaped = escapeRegex(rawKeyword);

  // Ưu tiên regex theo keyword người dùng nhập để match đúng tên sản phẩm có dấu.
  let result = await productRepo.findByKeyword(escaped, criteria, page);

  // Fallback full-text chỉ dùng khi regex không có kết quả.
  if (result.products.length === 0) {
    result = await productRepo.findByTextSearch(rawKeyword, criteria, page);

    // Giữ kết quả liên quan đến tên sản phẩm, tránh trả về item không đúng keyword.
    const kw = rawKeyword.toLowerCase();
    const filtered = result.products.filter((p) =>
      (p.name || "").toLowerCase().includes(kw),
    );
    result = {
      ...result,
      products: filtered,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / 12)),
    };
  }

  return result;
};

/**
 * UC-02: Lọc sản phẩm
 */
const filter = async (criteria, page) => {
  return productRepo.findByCriteria(criteria, page);
};

/**
 * UC-03: Tìm kiếm bằng hình ảnh
 */
const imageSearch = async (file) => {
  if (!file) throw new ApiError(400, "Vui lòng tải lên 1 ảnh.");

  // Trích xuất feature vector từ ảnh
  const queryVector = await extractFeatures(file.buffer);

  // Lấy tất cả sản phẩm có imageVector
  const products = await productRepo.findAllWithVector();

  // Tính cosine similarity, sắp xếp theo similarity giảm dần
  const scored = products
    .map((p) => ({
      product: p,
      similarity: cosineSimilarity(queryVector, p.imageVector),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 12) // Top 12 kết quả
    .filter((s) => s.similarity > 0.1) // Loại bỏ kết quả quá thấp
    .map((s) => s.product);

  return scored;
};

/**
 * UC-04: Xem chi tiết sản phẩm
 */
const getDetail = async (productId) => {
  const product = await productRepo.findById(productId);
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm.");
  if (product.status === "inactive")
    throw new ApiError(404, "Sản phẩm không còn hoạt động.");

  // Đồng bộ avgRating theo công thức tổng sao / tổng lượt đánh giá.
  const stats = await reviewRepo.calculateAvgRating(productId);
  const roundedAvg = Math.round(stats.avgRating * 10) / 10;
  if (roundedAvg !== product.avgRating) {
    await productRepo.updateAvgRating(productId, roundedAvg);
    product.avgRating = roundedAvg;
  }

  // Tăng viewCount (không cần await, fire-and-forget)
  productRepo.incrementViewCount(productId);

  return product;
};

/**
 * Sản phẩm gợi ý (cùng category)
 */
const getSimilar = async (productId) => {
  const product = await productRepo.findById(productId);
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm.");

  return productRepo.findSimilar(productId, product.category);
};

const getRecommendations = async ({ userId, currentProductId, limit = 8 }) => {
  const normalizedLimit = normalizeLimit(limit, 8, 24);

  if (!userId) {
    const excludedIds = currentProductId ? [currentProductId] : [];
    const products = await productRepo.findPopularExcluding(
      excludedIds,
      normalizedLimit,
    );
    return {
      source: "cold_start",
      products,
    };
  }

  const [recentOrders, topRatedReviews] = await Promise.all([
    orderRepo.findRecentOrderItemsByCustomer(userId, 80),
    reviewRepo.findTopRatedByCustomer(userId, 4, 40),
  ]);

  const purchasedProductIds = new Set();
  const purchaseStrengthMap = new Map();
  const categoryWeightMap = new Map();
  const seedProductIds = new Set();
  const orderCount = recentOrders.length || 1;

  recentOrders.forEach((order, index) => {
    const recencyWeight = 0.8 + ((orderCount - index) / orderCount) * 0.6;

    for (const item of order.items || []) {
      const productId = toIdString(item.productId);
      if (!productId) continue;

      purchasedProductIds.add(productId);
      seedProductIds.add(productId);

      const qty = Number(item.quantity || 1);
      const score = Math.max(1, qty) * recencyWeight;
      purchaseStrengthMap.set(
        productId,
        (purchaseStrengthMap.get(productId) || 0) + score,
      );
    }
  });

  const purchasedProducts = await productRepo.findActiveByIds([
    ...purchasedProductIds,
  ]);
  for (const product of purchasedProducts) {
    const category = String(product.category || "").trim();
    if (!category) continue;
    const productId = String(product._id);
    const score = purchaseStrengthMap.get(productId) || 0;
    categoryWeightMap.set(
      category,
      (categoryWeightMap.get(category) || 0) + score,
    );
  }

  for (const review of topRatedReviews) {
    const ratedProductId = toIdString(review.productId);
    if (ratedProductId) seedProductIds.add(ratedProductId);

    const category = review.productId?.category;
    if (category) {
      const ratingScore = Math.max(1, Number(review.rating || 0) - 2);
      const key = String(category).trim();
      categoryWeightMap.set(
        key,
        (categoryWeightMap.get(key) || 0) + ratingScore,
      );
    }
  }

  const excludedIds = new Set([...purchasedProductIds]);
  if (currentProductId) excludedIds.add(String(currentProductId));

  const preferredCategories = [...categoryWeightMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category]) => category);

  const [coPurchasedRows, categoryCandidates] = await Promise.all([
    orderRepo.aggregateCoPurchasedProducts(
      [...seedProductIds],
      [...excludedIds],
      120,
    ),
    productRepo.findActiveByCategories(
      preferredCategories,
      [...excludedIds],
      80,
    ),
  ]);

  const coPurchaseMap = new Map(
    coPurchasedRows.map((row) => [
      String(row._id),
      Number(row.coPurchaseCount || 0),
    ]),
  );

  const candidateIdSet = new Set([
    ...coPurchasedRows.map((row) => String(row._id)),
    ...categoryCandidates.map((item) => String(item._id)),
  ]);

  if (candidateIdSet.size === 0) {
    const products = await productRepo.findPopularExcluding(
      [...excludedIds],
      normalizedLimit,
    );
    return {
      source: "fallback_popular",
      products,
    };
  }

  const candidates = await productRepo.findActiveByIds([...candidateIdSet]);
  const maxCoPurchase = getMapMax(coPurchaseMap);
  const maxCategoryWeight = getMapMax(categoryWeightMap);
  const maxSold = Math.max(
    ...candidates.map((item) => Number(item.soldCount || 0)),
    1,
  );
  const maxView = Math.max(
    ...candidates.map((item) => Number(item.viewCount || 0)),
    1,
  );

  const scored = candidates
    .map((item) => {
      const id = String(item._id);
      const category = String(item.category || "").trim();

      const coPurchaseScore = (coPurchaseMap.get(id) || 0) / maxCoPurchase;
      const categoryScore =
        (categoryWeightMap.get(category) || 0) / maxCategoryWeight;
      const popularityScore =
        (Number(item.soldCount || 0) / maxSold) * 0.7 +
        (Number(item.viewCount || 0) / maxView) * 0.3;
      const ratingScore = Number(item.avgRating || 0) / 5;
      const noveltyScore = calculateRecencyBoost(item.createdAt);

      const finalScore =
        coPurchaseScore * 0.42 +
        categoryScore * 0.25 +
        popularityScore * 0.2 +
        ratingScore * 0.08 +
        noveltyScore * 0.05;

      return { item, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, normalizedLimit)
    .map((entry) => entry.item);

  if (scored.length < normalizedLimit) {
    const topUp = await productRepo.findPopularExcluding(
      [...excludedIds, ...scored.map((item) => String(item._id))],
      normalizedLimit - scored.length,
    );

    return {
      source: "hybrid",
      products: [...scored, ...topUp],
    };
  }

  return {
    source: "hybrid",
    products: scored,
  };
};

/**
 * Sản phẩm phổ biến (trang chủ)
 */
const getPopular = async (page = 1, limit = 12) => {
  return productRepo.findPopular(page, limit);
};

const getCategories = async () => {
  return productRepo.listActiveCategories();
};

// ========================
// ADMIN
// ========================
const createProduct = async (data, files) => {
  // Upload ảnh lên Cloudinary
  const imageUrls = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadToCloudinary(file.buffer, "ecommerce/products");
      imageUrls.push(url);
    }
  }

  return productRepo.create({ ...data, images: imageUrls });
};

const updateProduct = async (id, data) => {
  const product = await productRepo.update(id, data);
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm.");
  return product;
};

const deleteProduct = async (id) => {
  const product = await productRepo.remove(id);
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm.");
  return { message: "Xóa sản phẩm thành công." };
};

const getAllProducts = async (page) => {
  return productRepo.findAll(page);
};

const updateProductStock = async (productId, stock) => {
  const parsedStock = Number(stock);
  if (!Number.isFinite(parsedStock) || parsedStock < 0) {
    throw new ApiError(400, "Tồn kho phải là số không âm.");
  }

  const product = await productRepo.updateStock(productId, parsedStock);
  if (!product) throw new ApiError(404, "Không tìm thấy sản phẩm.");
  return product;
};

const getCategoryManagementList = async () => {
  return productRepo.listCategoriesWithCount();
};

const renameCategory = async ({ fromName, toName }) => {
  const from = String(fromName || "").trim();
  const to = String(toName || "").trim();
  if (!from || !to) {
    throw new ApiError(
      400,
      "Vui lòng nhập đầy đủ danh mục nguồn và danh mục mới.",
    );
  }
  if (from.toLowerCase() === to.toLowerCase()) {
    throw new ApiError(400, "Danh mục mới phải khác danh mục nguồn.");
  }

  const result = await productRepo.renameCategory(from, to);
  return {
    modifiedCount: result.modifiedCount || 0,
    message: "Đổi tên danh mục thành công.",
  };
};

const deleteCategory = async ({ name, moveTo }) => {
  const categoryName = String(name || "").trim();
  const moveTarget = String(moveTo || "").trim();
  if (!categoryName) {
    throw new ApiError(400, "Tên danh mục không hợp lệ.");
  }

  const result = await productRepo.removeCategory(categoryName, moveTarget);
  return {
    modifiedCount: result.modifiedCount || 0,
    message: "Xử lý xóa danh mục thành công.",
  };
};

module.exports = {
  search,
  filter,
  imageSearch,
  getDetail,
  getSimilar,
  getRecommendations,
  getPopular,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  updateProductStock,
  getCategoryManagementList,
  renameCategory,
  deleteCategory,
};
