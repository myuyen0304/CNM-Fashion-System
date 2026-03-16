const Product = require("./product.model");

const parseWeight = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const POPULAR_WEIGHT_SOLD = parseWeight(process.env.POPULAR_WEIGHT_SOLD, 1);
const POPULAR_WEIGHT_VIEW = parseWeight(process.env.POPULAR_WEIGHT_VIEW, 1);
const POPULAR_WEIGHT_RATING = parseWeight(process.env.POPULAR_WEIGHT_RATING, 1);

const buildPopularScoreExpression = () => ({
  $add: [
    { $multiply: [{ $ifNull: ["$soldCount", 0] }, POPULAR_WEIGHT_SOLD] },
    { $multiply: [{ $ifNull: ["$viewCount", 0] }, POPULAR_WEIGHT_VIEW] },
    { $multiply: [{ $ifNull: ["$avgRating", 0] }, POPULAR_WEIGHT_RATING] },
  ],
});

const POPULAR_SORT = {
  popularScore: -1,
  soldCount: -1,
  viewCount: -1,
  avgRating: -1,
};

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildCategoryFallbackFilter = (categories) => {
  const normalizedValues = (
    Array.isArray(categories) ? categories : [categories]
  )
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  if (normalizedValues.length === 0) return null;

  const regexList = normalizedValues.map(
    (value) => new RegExp(escapeRegExp(value), "i"),
  );

  return {
    $or: [
      { category: { $in: regexList } },
      { name: { $in: regexList } },
      { description: { $in: regexList } },
    ],
  };
};

const listActiveCategories = async () => {
  const categories = await Product.distinct("category", {
    status: "active",
    category: { $exists: true, $type: "string", $ne: "" },
  });

  return categories
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "vi"));
};

const findById = async (id) => {
  return Product.findById(id);
};

const findPopular = async (page = 1, limit = 40) => {
  const skip = (page - 1) * limit;
  const filter = { status: "active" };

  const [products, total] = await Promise.all([
    Product.aggregate([
      { $match: filter },
      { $addFields: { popularScore: buildPopularScoreExpression() } },
      { $sort: POPULAR_SORT },
      { $skip: skip },
      { $limit: limit },
    ]),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
    total,
    page,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

/**
 * Tìm kiếm bằng regex (keyword match tên, mô tả)
 * Ưu tiên: exact match name > startsWith name > contains name > category
 */
const findByKeyword = async (keyword, criteria = {}, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;
  const regex = new RegExp(keyword, "i");

  // Chỉ tìm trong name để tránh kết quả không liên quan
  // (category có thể chứa từ khóa khác, ví dụ: "Quần áo" match khi search "áo")
  const filter = {
    status: "active",
    name: regex,
  };

  const categoryFilter = buildCategoryFallbackFilter(criteria.categories);
  if (categoryFilter) Object.assign(filter, categoryFilter);
  if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
    filter.price = {};
    if (criteria.minPrice !== undefined) filter.price.$gte = criteria.minPrice;
    if (criteria.maxPrice !== undefined) filter.price.$lte = criteria.maxPrice;
  }
  if (criteria.minRating) {
    filter.avgRating = { $gte: criteria.minRating };
  }

  let sort = { soldCount: -1 };
  let usePopularFormula = false;
  switch (criteria.sortBy) {
    case "price_asc":
      sort = { price: 1 };
      break;
    case "price_desc":
      sort = { price: -1 };
      break;
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "rating":
      sort = { avgRating: -1 };
      break;
    case "popular":
    default:
      usePopularFormula = true;
      break;
  }

  const [allProducts, total] = await Promise.all([
    usePopularFormula
      ? Product.aggregate([
          { $match: filter },
          { $addFields: { popularScore: buildPopularScoreExpression() } },
          { $sort: POPULAR_SORT },
        ])
      : Product.find(filter).sort(sort).lean(),
    Product.countDocuments(filter),
  ]);

  // Sắp xếp lại: exact match name lên đầu, tiếp theo startsWith, rồi contains
  const kw = keyword.toLowerCase();
  const exactMatch = [];
  const startsWithMatch = [];
  const rest = [];
  for (const p of allProducts) {
    const nameLower = (p.name || "").toLowerCase();
    if (nameLower === kw) exactMatch.push(p);
    else if (nameLower.startsWith(kw)) startsWithMatch.push(p);
    else rest.push(p);
  }
  const sorted = [...exactMatch, ...startsWithMatch, ...rest];
  const products = sorted.slice(skip, skip + limit);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Full-text search (MongoDB text index)
 */
const findByTextSearch = async (
  keyword,
  criteria = {},
  page = 1,
  limit = 12,
) => {
  const skip = (page - 1) * limit;

  const filter = {
    status: "active",
    $text: { $search: keyword },
  };

  const categoryFilter = buildCategoryFallbackFilter(criteria.categories);
  if (categoryFilter) Object.assign(filter, categoryFilter);
  if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
    filter.price = {};
    if (criteria.minPrice !== undefined) filter.price.$gte = criteria.minPrice;
    if (criteria.maxPrice !== undefined) filter.price.$lte = criteria.maxPrice;
  }
  if (criteria.minRating) {
    filter.avgRating = { $gte: criteria.minRating };
  }

  let sort = { score: { $meta: "textScore" } };
  let usePopularFormula = false;
  switch (criteria.sortBy) {
    case "price_asc":
      sort = { price: 1 };
      break;
    case "price_desc":
      sort = { price: -1 };
      break;
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "rating":
      sort = { avgRating: -1 };
      break;
    case "popular":
      usePopularFormula = true;
      break;
    default:
      sort = { score: { $meta: "textScore" } };
      break;
  }

  const [products, total] = await Promise.all([
    usePopularFormula
      ? Product.aggregate([
          { $match: filter },
          { $addFields: { popularScore: buildPopularScoreExpression() } },
          { $sort: POPULAR_SORT },
          { $skip: skip },
          { $limit: limit },
        ])
      : Product.find(filter, { score: { $meta: "textScore" } })
          .sort(sort)
          .skip(skip)
          .limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Lọc sản phẩm theo tiêu chí
 */
const findByCriteria = async (criteria, page = 1, limit = 12) => {
  const skip = (page - 1) * limit;
  const filter = { status: "active" };

  const categoryFilter = buildCategoryFallbackFilter(criteria.categories);
  if (categoryFilter) Object.assign(filter, categoryFilter);
  if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
    filter.price = {};
    if (criteria.minPrice !== undefined) filter.price.$gte = criteria.minPrice;
    if (criteria.maxPrice !== undefined) filter.price.$lte = criteria.maxPrice;
  }
  if (criteria.minRating) {
    filter.avgRating = { $gte: criteria.minRating };
  }

  // Sắp xếp
  let sort = {};
  let usePopularFormula = false;
  switch (criteria.sortBy) {
    case "price_asc":
      sort = { price: 1 };
      break;
    case "price_desc":
      sort = { price: -1 };
      break;
    case "newest":
      sort = { createdAt: -1 };
      break;
    case "rating":
      sort = { avgRating: -1 };
      break;
    case "popular":
    default:
      usePopularFormula = true;
      break;
  }

  const [products, total] = await Promise.all([
    usePopularFormula
      ? Product.aggregate([
          { $match: filter },
          { $addFields: { popularScore: buildPopularScoreExpression() } },
          { $sort: POPULAR_SORT },
          { $skip: skip },
          { $limit: limit },
        ])
      : Product.find(filter).sort(sort).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { products, total, page, totalPages: Math.ceil(total / limit) };
};

/**
 * Tìm sản phẩm tương tự bằng imageVector (cosine similarity).
 * Query tất cả sản phẩm có imageVector, tính similarity ở application layer.
 */
const findAllWithVector = async () => {
  return Product.find({
    status: "active",
    imageVector: { $exists: true, $not: { $size: 0 } },
  }).select("_id name price images imageVector category");
};

/**
 * Tìm sản phẩm tương tự (cùng category, trừ chính nó)
 */
const findSimilar = async (productId, category, limit = 6) => {
  return Product.find({
    _id: { $ne: productId },
    category,
    status: "active",
  })
    .sort({ soldCount: -1 })
    .limit(limit);
};

/**
 * Tăng viewCount
 */
const incrementViewCount = async (id) => {
  return Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
};

/**
 * Kiểm tra tồn kho nhiều sản phẩm 1 lần
 */
const checkStockBatch = async (productIds) => {
  return Product.find({ _id: { $in: productIds } }).select(
    "_id name stock price",
  );
};

/**
 * Cập nhật avgRating
 */
const updateAvgRating = async (productId, avgRating) => {
  return Product.findByIdAndUpdate(productId, { avgRating });
};

/**
 * Giảm stock sau khi đặt hàng
 */
const decreaseStock = async (productId, quantity) => {
  return Product.findByIdAndUpdate(productId, {
    $inc: { stock: -quantity, soldCount: quantity },
  });
};

/**
 * Tăng stock khi hủy đơn
 */
const increaseStock = async (productId, quantity) => {
  return Product.findByIdAndUpdate(productId, {
    $inc: { stock: quantity, soldCount: -quantity },
  });
};

// ========================
// ADMIN CRUD
// ========================
const create = async (data) => {
  const product = new Product(data);
  return product.save();
};

const update = async (id, data) => {
  return Product.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

const remove = async (id) => {
  return Product.findByIdAndUpdate(id, { status: "inactive" });
};

/**
 * Lấy tất cả sản phẩm (admin, kể cả inactive)
 */
const findAll = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(),
  ]);
  return { products, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = {
  findById,
  findPopular,
  listActiveCategories,
  findByKeyword,
  findByTextSearch,
  findByCriteria,
  findAllWithVector,
  findSimilar,
  incrementViewCount,
  checkStockBatch,
  updateAvgRating,
  decreaseStock,
  increaseStock,
  create,
  update,
  remove,
  findAll,
};
