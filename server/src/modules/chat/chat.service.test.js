const test = require("node:test");
const assert = require("node:assert/strict");
const chatRepo = require("./chat.repository");

const chatServicePath = require.resolve("./chat.service");
const aiService = require("../../shared/services/aiService");
const socketConfig = require("../../config/socket");

const createIoMock = () => {
  const events = [];

  return {
    events,
    to(roomId) {
      return {
        emit(event, payload) {
          events.push({ roomId, event, payload });
        },
      };
    },
  };
};

const loadChatService = (streamImpl, io) => {
  const originalStream = aiService.claudeChatbotReplyStream;
  const originalGetIO = socketConfig.getIO;

  aiService.claudeChatbotReplyStream = streamImpl;
  socketConfig.getIO = () => io;
  delete require.cache[chatServicePath];

  const service = require(chatServicePath);

  return {
    service,
    restore() {
      delete require.cache[chatServicePath];
      aiService.claudeChatbotReplyStream = originalStream;
      socketConfig.getIO = originalGetIO;
    },
  };
};

const createGuestRoom = () => ({
  _id: "room-1",
  isGuestSession: true,
  guestToken: "guest-1",
  status: "active",
  adminId: null,
  awaitingResolutionConfirm: false,
});

const createAuthRoom = () => ({
  _id: "room-1",
  customerId: "customer-1",
  isGuestSession: false,
  guestToken: null,
  status: "active",
  adminId: null,
  awaitingResolutionConfirm: false,
});

const waitForAsyncWork = () => new Promise((resolve) => setTimeout(resolve, 0));

test("getOrCreateRoom attaches a guest room when the visitor logs in", async (t) => {
  const io = createIoMock();
  const { service, restore } = loadChatService(async () => {}, io);
  t.after(restore);

  const guestRoom = createGuestRoom();
  const authRoom = createAuthRoom();

  const findCustomerMock = t.mock.method(
    chatRepo,
    "findRoomByCustomer",
    async () => null,
  );
  const findGuestMock = t.mock.method(
    chatRepo,
    "findRoomByGuestToken",
    async () => guestRoom,
  );
  const attachMock = t.mock.method(
    chatRepo,
    "attachRoomToCustomer",
    async () => authRoom,
  );
  const findOrCreateMock = t.mock.method(
    chatRepo,
    "findOrCreateRoom",
    async () => {
      throw new Error("should not create a separate customer room");
    },
  );
  t.mock.method(chatRepo, "countMessages", async () => 1);

  const result = await service.getOrCreateRoom({
    user: { _id: "customer-1", name: "Linh" },
    guestToken: "guest-1",
  });

  assert.equal(result, authRoom);
  assert.equal(findCustomerMock.mock.calls.length, 1);
  assert.equal(findGuestMock.mock.calls.length, 1);
  assert.deepEqual(attachMock.mock.calls[0].arguments, ["room-1", "customer-1"]);
  assert.equal(findOrCreateMock.mock.calls.length, 0);
});

test("sendMessage rejects when another worker already holds the chat lock", async (t) => {
  const io = createIoMock();
  const { service, restore } = loadChatService(async () => {}, io);
  t.after(restore);

  t.mock.method(chatRepo, "findRoomById", async () => createGuestRoom());
  const acquireLockMock = t.mock.method(
    chatRepo,
    "tryAcquireProcessingLock",
    async () => null,
  );
  const releaseLockMock = t.mock.method(
    chatRepo,
    "releaseProcessingLock",
    async () => ({}),
  );

  await assert.rejects(
    () =>
      service.sendMessage(
        { guestToken: "guest-1" },
        "room-1",
        { content: "Xin chao" },
      ),
    (error) => {
      assert.equal(error.statusCode, 429);
      assert.match(error.message, /Bot/);
      return true;
    },
  );

  assert.equal(acquireLockMock.mock.calls.length, 1);
  assert.equal(releaseLockMock.mock.calls.length, 0);
});

test("sendMessage releases the shared chat lock after bot streaming completes", async (t) => {
  const io = createIoMock();
  const { service, restore } = loadChatService(
    async (_message, _history, _productContext, _orderContext, onChunk, onDone) => {
      onChunk("Xin ");
      await onDone("Xin chao");
    },
    io,
  );
  t.after(restore);

  let messageCounter = 0;
  t.mock.method(chatRepo, "findRoomById", async () => createGuestRoom());
  const acquireLockMock = t.mock.method(
    chatRepo,
    "tryAcquireProcessingLock",
    async () => ({ _id: "room-1" }),
  );
  const releaseLockMock = t.mock.method(
    chatRepo,
    "releaseProcessingLock",
    async () => ({}),
  );
  t.mock.method(chatRepo, "saveMessage", async (payload) => ({
    _id: `msg-${++messageCounter}`,
    type: payload.type || "text",
    sentAt: new Date(),
    ...payload,
  }));
  t.mock.method(chatRepo, "updateRoomLastMessage", async () => ({}));
  t.mock.method(chatRepo, "getRecentMessages", async () => []);
  t.mock.method(chatRepo, "updateRoomStatus", async () => ({}));

  const result = await service.sendMessage(
    { guestToken: "guest-1" },
    "room-1",
    { content: "Xin chao" },
  );

  assert.equal(result.senderRole, "customer");

  await waitForAsyncWork();

  assert.equal(acquireLockMock.mock.calls.length, 1);
  assert.equal(releaseLockMock.mock.calls.length, 1);
  assert.equal(
    releaseLockMock.mock.calls[0].arguments[1],
    acquireLockMock.mock.calls[0].arguments[1],
  );
  assert.ok(io.events.some((event) => event.event === "botStreamStart"));
  assert.ok(io.events.some((event) => event.event === "botStreamEnd"));
});

test("sendMessage releases the shared chat lock when bot streaming fails", async (t) => {
  const io = createIoMock();
  const { service, restore } = loadChatService(async () => {
    throw new Error("stream failed");
  }, io);
  t.after(restore);

  t.mock.method(console, "error", () => {});

  let messageCounter = 0;
  t.mock.method(chatRepo, "findRoomById", async () => createGuestRoom());
  const acquireLockMock = t.mock.method(
    chatRepo,
    "tryAcquireProcessingLock",
    async () => ({ _id: "room-1" }),
  );
  const releaseLockMock = t.mock.method(
    chatRepo,
    "releaseProcessingLock",
    async () => ({}),
  );
  t.mock.method(chatRepo, "saveMessage", async (payload) => ({
    _id: `msg-${++messageCounter}`,
    type: payload.type || "text",
    sentAt: new Date(),
    ...payload,
  }));
  t.mock.method(chatRepo, "updateRoomLastMessage", async () => ({}));
  t.mock.method(chatRepo, "getRecentMessages", async () => []);

  await service.sendMessage(
    { guestToken: "guest-1" },
    "room-1",
    { content: "Xin chao" },
  );

  await waitForAsyncWork();

  assert.equal(acquireLockMock.mock.calls.length, 1);
  assert.equal(releaseLockMock.mock.calls.length, 1);
  assert.equal(
    releaseLockMock.mock.calls[0].arguments[1],
    acquireLockMock.mock.calls[0].arguments[1],
  );

  const botStreamEnd = io.events.find((event) => event.event === "botStreamEnd");
  assert.ok(botStreamEnd);
  assert.equal(botStreamEnd.payload.error, true);
});
