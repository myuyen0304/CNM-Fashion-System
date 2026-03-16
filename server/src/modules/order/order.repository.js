const Order = require("./order.model");
const { ORDER_STATUS } = require("../../shared/constants");

const createOrder = async (orderData) => {
  const order = new Order(orderData);
  return order.save();
};

const findOrderById = async (id) => {
  return Order.findById(id).populate("customerId", "name email phone");
};

const findOrdersByCustomer = async (customerId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ customerId }),
  ]);
  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

const updateOrderStatus = async (orderId, status) => {
  return Order.findByIdAndUpdate(orderId, { status }, { new: true });
};

const updateTransaction = async (orderId, transactionData) => {
  return Order.findByIdAndUpdate(
    orderId,
    { transaction: transactionData },
    { new: true },
  );
};

const findOrderByTransactionId = async (transactionId) => {
  return Order.findOne({ "transaction.transactionId": transactionId });
};

module.exports = {
  createOrder,
  findOrderById,
  findOrdersByCustomer,
  updateOrderStatus,
  updateTransaction,
  findOrderByTransactionId,
};
