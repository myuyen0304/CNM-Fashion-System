const productService = require("./product.service");
const catchAsync = require("../../shared/utils/catchAsync");
const ApiError = require("../../shared/utils/ApiError");

const parseCriteria = (query) => {
  const { category, categories, minPrice, maxPrice, minRating, sortBy } = query;

  const parseCategories = () => {
    if (Array.isArray(categories)) {
      return categories
        .map((item) => String(item || "").trim())
        .filter(Boolean);
    }

    if (typeof categories === "string") {
      return categories
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (category) {
      return [String(category).trim()].filter(Boolean);
    }

    return [];
  };

  const parseOptionalNumber = (value, fieldLabel) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new ApiError(400, `${fieldLabel} không hợp lệ.`);
    }
    if (parsed < 0) {
      throw new ApiError(400, `${fieldLabel} không được là số âm.`);
    }

    return parsed;
  };

  const parsedMinPrice = parseOptionalNumber(minPrice, "Giá tối thiểu");
  const parsedMaxPrice = parseOptionalNumber(maxPrice, "Giá tối đa");
  const parsedMinRating = parseOptionalNumber(minRating, "Đánh giá tối thiểu");

  if (
    parsedMinPrice !== undefined &&
    parsedMaxPrice !== undefined &&
    parsedMinPrice > parsedMaxPrice
  ) {
    throw new ApiError(400, "Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.");
  }

  if (parsedMinRating !== undefined && parsedMinRating > 5) {
    throw new ApiError(400, "Đánh giá tối thiểu phải từ 0 đến 5.");
  }

  return {
    categories: parseCategories(),
    minPrice: parsedMinPrice,
    maxPrice: parsedMaxPrice,
    minRating: parsedMinRating,
    sortBy,
  };
};

// UC-01: Tìm kiếm
const searchByKeyword = catchAsync(async (req, res) => {
  const { q, page } = req.query;
  const criteria = parseCriteria(req.query);
  const result = await productService.search(q, criteria, parseInt(page) || 1);
  res.json({ success: true, data: result });
});

// UC-02: Lọc sản phẩm
const filterProducts = catchAsync(async (req, res) => {
  const { page } = req.query;
  const criteria = parseCriteria(req.query);
  const result = await productService.filter(criteria, parseInt(page) || 1);
  res.json({ success: true, data: result });
});

// UC-03: Tìm kiếm bằng hình ảnh
const imageSearch = catchAsync(async (req, res) => {
  const products = await productService.imageSearch(req.file);
  res.json({ success: true, data: products });
});

// UC-04: Chi tiết sản phẩm
const getProductDetail = catchAsync(async (req, res) => {
  const product = await productService.getDetail(req.params.id);
  res.json({ success: true, data: product });
});

// Sản phẩm tương tự
const getSimilarProducts = catchAsync(async (req, res) => {
  const products = await productService.getSimilar(req.params.id);
  res.json({ success: true, data: products });
});

const getRecommendations = catchAsync(async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 8;

  const data = await productService.getRecommendations({
    userId: req.user?._id,
    currentProductId: req.query.currentProductId,
    limit,
  });

  res.json({ success: true, data });
});

const getPublicRecommendations = catchAsync(async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 8;

  const data = await productService.getRecommendations({
    userId: null,
    currentProductId: req.query.currentProductId,
    limit,
  });

  res.json({ success: true, data });
});

// Sản phẩm phổ biến (trang chủ)
const getPopularProducts = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const rawLimit = Math.max(parseInt(req.query.limit, 10) || 40, 1);
  const limit = Math.min(rawLimit, 40);
  const result = await productService.getPopular(page, limit);
  res.json({ success: true, data: result });
});

const getCategories = catchAsync(async (_req, res) => {
  const categories = await productService.getCategories();
  res.json({ success: true, data: categories });
});

// === ADMIN ===
const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body, req.files);
  res.status(201).json({ success: true, data: product });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.json({ success: true, data: product });
});

const deleteProduct = catchAsync(async (req, res) => {
  const result = await productService.deleteProduct(req.params.id);
  res.json({ success: true, ...result });
});

const getAllProducts = catchAsync(async (req, res) => {
  const result = await productService.getAllProducts(
    parseInt(req.query.page) || 1,
  );
  res.json({ success: true, data: result });
});

const updateStock = catchAsync(async (req, res) => {
  const product = await productService.updateProductStock(
    req.params.id,
    req.body.stock,
  );
  res.json({ success: true, data: product });
});

const getCategoryManagementList = catchAsync(async (_req, res) => {
  const data = await productService.getCategoryManagementList();
  res.json({ success: true, data });
});

const renameCategory = catchAsync(async (req, res) => {
  const result = await productService.renameCategory(req.body);
  res.json({ success: true, data: result });
});

const deleteCategory = catchAsync(async (req, res) => {
  const result = await productService.deleteCategory({
    name: req.params.name,
    moveTo: req.body?.moveTo,
  });
  res.json({ success: true, data: result });
});

module.exports = {
  searchByKeyword,
  filterProducts,
  imageSearch,
  getProductDetail,
  getSimilarProducts,
  getRecommendations,
  getPublicRecommendations,
  getPopularProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  updateStock,
  getCategoryManagementList,
  renameCategory,
  deleteCategory,
};
