const Order = require("./order.model");
const mongoose = require("mongoose");
const { ORDER_STATUS } = require("../../shared/constants");

const LEGACY_ORDER_STATUS = {
  PENDING: "Ch? thanh toán",
  PAID: "Ðã thanh toán",
  SHIPPING: "Ðang giao",
  COMPLETED: "Hoàn t?t",
  CANCELLED: "H?y",
};

const ORDER_STATUS_ALIASES = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PENDING, LEGACY_ORDER_STATUS.PENDING],
  [ORDER_STATUS.PAID]: [ORDER_STATUS.PAID, LEGACY_ORDER_STATUS.PAID],
  [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.SHIPPING, LEGACY_ORDER_STATUS.SHIPPING],
  [ORDER_STATUS.COMPLETED]: [ORDER_STATUS.COMPLETED, LEGACY_ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.CANCELLED, LEGACY_ORDER_STATUS.CANCELLED],
};

const resolveStatusFilter = (status) => {
  if (!status) return [];
  return ORDER_STATUS_ALIASES[status] || [status];
};

const createOrder = async (orderData, options = {}) => {
  const order = new Order(orderData);
  return order.save(options.session ? { session: options.session } : undefined);
};

const saveOrder = async (order, options = {}) => {
  return order.save(options.session ? { session: options.session } : undefined);
};

const findOrderById = async (id, options = {}) => {
  let query = Order.findById(id);

  if (options.populateCustomer !== false) {
    query = query.populate("customerId", "name email phone role");
  }

  if (options.session) {
    query = query.session(options.session);
  }

  return query;
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

  if (status) {
    const statuses = resolveStatusFilter(status);
    filter.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
  }
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

const updateOrderStatus = async (orderId, status, options = {}) => {
  return Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true, session: options.session },
  );
};

const updateTransaction = async (orderId, transactionData, options = {}) => {
  const sets = {};
  for (const key of Object.keys(transactionData)) {
    sets[`transaction.${key}`] = transactionData[key];
  }
  return Order.findByIdAndUpdate(
    orderId,
    { $set: sets },
    { new: true, session: options.session },
  );
};

const updateReturnRequest = async (orderId, returnRequest, options = {}) => {
  return Order.findByIdAndUpdate(
    orderId,
    { returnRequest },
    { new: true, session: options.session },
  );
};

const findOrderByTransactionId = async (transactionId) => {
  return Order.findOne({ "transaction.transactionId": transactionId });
};

const aggregateRevenue = async ({ period = "day", from, to }) => {
  const match = {
    status: {
      $in: [
        ...resolveStatusFilter(ORDER_STATUS.PAID),
        ...resolveStatusFilter(ORDER_STATUS.COMPLETED),
      ],
    },
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

const findRecentOrderItemsByCustomer = async (customerId, limit = 80) => {
  return Order.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("items.productId items.quantity createdAt")
    .lean();
};

const aggregateCoPurchasedProducts = async (
  seedProductIds,
  excludedProductIds = [],
  limit = 120,
) => {
  const normalizedSeeds = (Array.isArray(seedProductIds) ? seedProductIds : [])
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (normalizedSeeds.length === 0) {
    return [];
  }

  const normalizedExcluded = (
    Array.isArray(excludedProductIds) ? excludedProductIds : []
  )
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return Order.aggregate([
    { $match: { "items.productId": { $in: normalizedSeeds } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        coPurchaseCount: { $sum: { $ifNull: ["$items.quantity", 1] } },
        latestOrderAt: { $max: "$createdAt" },
      },
    },
    {
      $match: {
        _id: { $nin: normalizedExcluded.concat(normalizedSeeds) },
      },
    },
    { $sort: { coPurchaseCount: -1, latestOrderAt: -1 } },
    { $limit: Math.max(1, limit) },
  ]);
};

module.exports = {
  createOrder,
  saveOrder,
  findOrderById,
  findOrdersByCustomer,
  findAllOrders,
  updateOrderStatus,
  updateTransaction,
  updateReturnRequest,
  findOrderByTransactionId,
  aggregateRevenue,
  findRecentOrderItemsByCustomer,
  aggregateCoPurchasedProducts,
};
