const Order = require("./order.model");
const { ORDER_STATUS } = require("../../shared/constants");

const createOrder = async (orderData) => {
  const order = new Order(orderData);
  return order.save();
};

const findOrderById = async (id) => {
  return Order.findById(id).populate("customerId", "name email phone role");
};

const findOrdersByCustomer = async (customerId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find({ customerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments({ customerId }),
  ]);
  return { orders, total, page, totalPages: Math.ceil(total / limit) };
};

const findAllOrders = async ({
  page = 1,
  limit = 20,
  status,
  paymentMethod,
  from,
  to,
}) => {
  const skip = (page - 1) * limit;
  const filter = {};

  if (status) filter.status = status;
  if (paymentMethod) filter.paymentMethod = paymentMethod;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
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

const updateReturnRequest = async (orderId, returnRequest) => {
  return Order.findByIdAndUpdate(
    orderId,
    { returnRequest },
    { new: true },
  );
};

const findOrderByTransactionId = async (transactionId) => {
  return Order.findOne({ "transaction.transactionId": transactionId });
};

const aggregateRevenue = async ({ period = "day", from, to }) => {
  const match = {
    status: { $in: [ORDER_STATUS.PAID, ORDER_STATUS.COMPLETED] },
  };

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const dateToStringFormat =
    period === "year" ? "%Y" : period === "month" ? "%Y-%m" : "%Y-%m-%d";

  return Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          bucket: {
            $dateToString: {
              format: dateToStringFormat,
              date: "$createdAt",
            },
          },
        },
        totalRevenue: { $sum: "$total" },
        orderCount: { $sum: 1 },
      },
    },
    { $sort: { "_id.bucket": 1 } },
    {
      $project: {
        _id: 0,
        bucket: "$_id.bucket",
        totalRevenue: 1,
        orderCount: 1,
      },
    },
  ]);
};

module.exports = {
  createOrder,
  findOrderById,
  findOrdersByCustomer,
  findAllOrders,
  updateOrderStatus,
  updateTransaction,
  updateReturnRequest,
  findOrderByTransactionId,
  aggregateRevenue,
};

