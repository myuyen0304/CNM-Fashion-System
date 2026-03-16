const ApiError = require("../../shared/utils/ApiError");
const cartRepo = require("./cart.repository");
const Product = require("../product/product.model");

const normalizeSize = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getCart = async (customerId) => {
  const cart = await cartRepo.getCart(customerId);
  return cart || { customerId, items: [] };
};

/**
 * UC-05.1: Thêm sản phẩm vào giỏ
 */
const addItem = async (customerId, { productId, quantity, size }) => {
  if (!productId || !quantity) {
    throw new ApiError(400, "Vui lòng cung cấp sản phẩm và số lượng.");
  }

  if (quantity <= 0) {
    throw new ApiError(400, "Số lượng phải lớn hơn 0.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Không tìm thấy sản phẩm.");
  }

  if (product.stock < quantity) {
    throw new ApiError(400, `Chỉ còn ${product.stock} sản phẩm trong kho.`);
  }

  const normalizedSize = normalizeSize(size);
  const productSizes = Array.isArray(product.sizes)
    ? product.sizes.map((item) => normalizeSize(item)).filter(Boolean)
    : [];

  if (productSizes.length > 0) {
    if (!normalizedSize) {
      throw new ApiError(400, "Vui lòng chọn size trước khi thêm vào giỏ.");
    }

    if (!productSizes.includes(normalizedSize)) {
      throw new ApiError(400, "Size không hợp lệ cho sản phẩm này.");
    }
  }

  const cart = await cartRepo.addOrUpdateItem(customerId, productId, quantity, {
    name: product.name,
    imageUrl: product.images[0] || null,
    unitPrice: product.price,
    size: normalizedSize,
  });

  return cart;
};

/**
 * UC-05.2: Cập nhật số lượng
 */
const updateItem = async (customerId, { itemId, quantity }) => {
  if (!itemId || quantity === undefined) {
    throw new ApiError(400, "Vui lòng cung cấp itemId và số lượng.");
  }

  if (quantity === 0) {
    return removeItem(customerId, itemId);
  }

  if (quantity < 0) {
    throw new ApiError(400, "Số lượng không được âm.");
  }

  const cart = await cartRepo.getCart(customerId);
  if (!cart) throw new ApiError(404, "Không tìm thấy giỏ hàng.");

  const item = cart.items.find((i) => i._id.toString() === itemId);
  if (!item) throw new ApiError(404, "Không tìm thấy sản phẩm trong giỏ hàng.");

  const product = await Product.findById(item.productId);
  if (product.stock < quantity) {
    throw new ApiError(400, `Chỉ còn ${product.stock} sản phẩm trong kho.`);
  }

  item.quantity = quantity;
  return cart.save();
};

/**
 * UC-05.3: Xóa sản phẩm
 */
const removeItem = async (customerId, itemId) => {
  const cart = await cartRepo.removeItem(customerId, itemId);
  if (!cart) throw new ApiError(404, "Không tìm thấy giỏ hàng.");
  return cart;
};

const clearCart = async (customerId) => {
  return cartRepo.clearCart(customerId);
};

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };
