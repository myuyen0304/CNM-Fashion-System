const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  ORDER_STATUS,
  RETURN_STATUS,
  INVENTORY_STATUS,
} = require("../../shared/constants");
const orderService = require("./order.service");
const orderRepo = require("./order.repository");
const cartRepo = require("../cart/cart.repository");
const productRepo = require("../product/product.repository");

const createSessionMock = () => ({
  withTransaction: async (work) => work(),
  endSession: async () => {},
});

test("createOrder creates order in a transaction and reserves inventory", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(cartRepo, "getCart", async () => ({
    items: [{ productId: "product-1", quantity: 2, size: "M" }],
  }));
  t.mock.method(productRepo, "findById", async () => ({
    _id: "product-1",
    name: "Áo sơ mi",
    images: ["shirt.jpg"],
    price: 150000,
    stock: 5,
  }));

  const decreaseStockMock = t.mock.method(
    productRepo,
    "decreaseStock",
    async () => ({ _id: "product-1" }),
  );

  const createOrderMock = t.mock.method(
    orderRepo,
    "createOrder",
    async (payload, options) => ({
      _id: "order-1",
      ...payload,
      session: options.session,
    }),
  );

  const order = await orderService.createOrder("customer-1", {
    shippingAddress: "123 Nguyen Trai, HCM",
    shippingPhone: "0900000000",
    shippingMethod: "standard",
    paymentMethod: "vnpay",
  });

  assert.equal(order._id, "order-1");
  assert.equal(order.inventory.status, INVENTORY_STATUS.RESERVED);
  assert.equal(order.returnRequest.status, RETURN_STATUS.NONE);
  assert.equal(order.total, 320000);
  assert.equal(createOrderMock.mock.calls.length, 1);
  assert.equal(decreaseStockMock.mock.calls.length, 1);
  assert.equal(decreaseStockMock.mock.calls[0].arguments[2].session, session);
  assert.equal(createOrderMock.mock.calls[0].arguments[1].session, session);
});

test("createOrder aborts when a later stock deduction fails", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(cartRepo, "getCart", async () => ({
    items: [
      { productId: "product-1", quantity: 1, size: "M" },
      { productId: "product-2", quantity: 2, size: "L" },
    ],
  }));
  t.mock.method(productRepo, "findById", async (productId) => ({
    _id: productId,
    name: productId === "product-1" ? "Áo sơ mi" : "Quần tây",
    images: [],
    price: productId === "product-1" ? 100000 : 200000,
    stock: 10,
  }));

  const decreaseStockMock = t.mock.method(
    productRepo,
    "decreaseStock",
    async (productId) => (productId === "product-1" ? { _id: productId } : null),
  );

  const createOrderMock = t.mock.method(orderRepo, "createOrder", async () => {
    throw new Error("createOrder should not be called");
  });

  await assert.rejects(
    () =>
      orderService.createOrder("customer-1", {
        shippingAddress: "123 Nguyen Trai, HCM",
        shippingPhone: "0900000000",
        shippingMethod: "express",
      }),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /vừa hết hàng/i);
      return true;
    },
  );

  assert.equal(decreaseStockMock.mock.calls.length, 2);
  assert.equal(createOrderMock.mock.calls.length, 0);
});

test("cancelOrder restores stock exactly once and marks inventory released", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(orderRepo, "findOrderById", async () => ({
    _id: "order-1",
    customerId: "customer-1",
    status: ORDER_STATUS.PENDING,
    items: [{ productId: "product-1", quantity: 2 }],
    inventory: { status: INVENTORY_STATUS.RESERVED },
  }));

  const increaseStockMock = t.mock.method(
    productRepo,
    "increaseStock",
    async () => ({ _id: "product-1" }),
  );

  t.mock.method(orderRepo, "saveOrder", async (order) => order);

  const order = await orderService.cancelOrder("order-1", "customer-1");

  assert.equal(increaseStockMock.mock.calls.length, 1);
  assert.equal(order.status, ORDER_STATUS.CANCELLED);
  assert.equal(order.inventory.status, INVENTORY_STATUS.RELEASED);
  assert.equal(order.inventory.releasedReason, "customer_cancelled");
});

test("updateOrderStatusByStaff rejects cancelling an order whose inventory was already released", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(orderRepo, "findOrderById", async () => ({
    _id: "order-1",
    customerId: "customer-1",
    status: ORDER_STATUS.CANCELLED,
    items: [{ productId: "product-1", quantity: 2 }],
    inventory: { status: INVENTORY_STATUS.RELEASED },
  }));

  const increaseStockMock = t.mock.method(
    productRepo,
    "increaseStock",
    async () => ({ _id: "product-1" }),
  );

  await assert.rejects(
    () => orderService.updateOrderStatusByStaff("order-1", ORDER_STATUS.CANCELLED),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /đã bị hủy trước đó/i);
      return true;
    },
  );

  assert.equal(increaseStockMock.mock.calls.length, 0);
});

test("handleReturnRequestByEmployee completes an approved return and releases inventory once", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(orderRepo, "findOrderById", async () => ({
    _id: "order-1",
    customerId: "customer-1",
    status: ORDER_STATUS.PAID,
    items: [{ productId: "product-1", quantity: 1 }],
    inventory: { status: INVENTORY_STATUS.RESERVED },
    returnRequest: { status: RETURN_STATUS.APPROVED, reason: "Size issue", note: "" },
  }));

  const increaseStockMock = t.mock.method(
    productRepo,
    "increaseStock",
    async () => ({ _id: "product-1" }),
  );

  t.mock.method(orderRepo, "saveOrder", async (order) => order);

  const order = await orderService.handleReturnRequestByEmployee(
    "order-1",
    { _id: "staff-1" },
    { action: "complete", note: "Returned to warehouse" },
  );

  assert.equal(increaseStockMock.mock.calls.length, 1);
  assert.equal(order.status, ORDER_STATUS.CANCELLED);
  assert.equal(order.inventory.status, INVENTORY_STATUS.RELEASED);
  assert.equal(order.returnRequest.status, RETURN_STATUS.COMPLETED);
  assert.equal(order.returnRequest.handledBy, "staff-1");
});

test("handleReturnRequestByEmployee rejects completing a return twice", async (t) => {
  const session = createSessionMock();
  t.mock.method(mongoose, "startSession", async () => session);
  t.mock.method(orderRepo, "findOrderById", async () => ({
    _id: "order-1",
    customerId: "customer-1",
    status: ORDER_STATUS.CANCELLED,
    items: [{ productId: "product-1", quantity: 1 }],
    inventory: { status: INVENTORY_STATUS.RELEASED },
    returnRequest: { status: RETURN_STATUS.COMPLETED, reason: "Size issue", note: "" },
  }));

  const increaseStockMock = t.mock.method(
    productRepo,
    "increaseStock",
    async () => ({ _id: "product-1" }),
  );

  await assert.rejects(
    () =>
      orderService.handleReturnRequestByEmployee(
        "order-1",
        { _id: "staff-1" },
        { action: "complete" },
      ),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /không thể hoàn tất đổi trả/i);
      return true;
    },
  );

  assert.equal(increaseStockMock.mock.calls.length, 0);
});
