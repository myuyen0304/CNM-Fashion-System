const mongoose = require("mongoose");
const Cart = require("./cart.model");

const getOrCreateCart = async (customerId) => {
  let cart = await Cart.findOne({ customerId });
  if (!cart) {
    cart = await Cart.create({ customerId, items: [] });
  }
  return cart;
};

const getCart = async (customerId) => {
  return Cart.findOne({ customerId });
};

const addOrUpdateItem = async (customerId, productId, quantity, itemData) => {
  const cart = await getOrCreateCart(customerId);
  const normalizedProductId = String(productId);
  const normalizedSize = String(itemData?.size || "")
    .trim()
    .toUpperCase();

  const itemIndex = cart.items.findIndex(
    (item) =>
      item.productId.toString() === normalizedProductId &&
      String(item.size || "")
        .trim()
        .toUpperCase() === normalizedSize,
  );

  if (itemIndex >= 0) {
    cart.items[itemIndex].quantity = quantity;
  } else {
    cart.items.push({
      _id: new mongoose.Types.ObjectId(),
      productId: normalizedProductId,
      quantity,
      ...itemData,
      size: normalizedSize,
    });
  }

  return cart.save();
};

const removeItem = async (customerId, itemId) => {
  const cart = await Cart.findOne({ customerId });
  if (!cart) return null;

  cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
  return cart.save();
};

const clearCart = async (customerId) => {
  return Cart.findOneAndUpdate({ customerId }, { items: [] }, { new: true });
};

module.exports = {
  getOrCreateCart,
  getCart,
  addOrUpdateItem,
  removeItem,
  clearCart,
};
