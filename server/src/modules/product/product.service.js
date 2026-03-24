const ApiError = require("../../shared/utils/ApiError");
const { escapeRegex } = require("../../shared/utils/normalize");
const {
  extractFeatures,
  cosineSimilarity,
} = require("../../shared/services/aiService");
const { uploadToCloudinary } = require("../../config/cloudinary");
const productRepo = require("./product.repository");
const reviewRepo = require("../review/review.repository");

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
    throw new ApiError(400, "Vui lòng nhập đầy đủ danh mục nguồn và danh mục mới.");
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
