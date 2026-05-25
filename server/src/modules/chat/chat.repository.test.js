const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const chatRepo = require("./chat.repository");
const { ChatRoom } = require("./chat.model");

test("findOrCreateRoom uses an atomic upsert for authenticated customers", async (t) => {
  const customerId = new mongoose.Types.ObjectId();
  const room = { _id: "room-1", customerId, isGuestSession: false };

  const findOneAndUpdateMock = t.mock.method(
    ChatRoom,
    "findOneAndUpdate",
    async () => room,
  );

  const result = await chatRepo.findOrCreateRoom(customerId);

  assert.equal(result, room);
  assert.equal(findOneAndUpdateMock.mock.calls.length, 1);

  const [filter, update, options] = findOneAndUpdateMock.mock.calls[0].arguments;
  assert.deepEqual(filter, { customerId, isGuestSession: false });
  assert.deepEqual(update, {
    $setOnInsert: {
      customerId,
      isGuestSession: false,
    },
  });
  assert.deepEqual(options, { new: true, upsert: true });
});

test("findOrCreateGuestRoom uses an atomic upsert for guest sessions", async (t) => {
  const room = { _id: "room-2", guestToken: "guest-1", isGuestSession: true };

  const findOneAndUpdateMock = t.mock.method(
    ChatRoom,
    "findOneAndUpdate",
    async () => room,
  );

  const result = await chatRepo.findOrCreateGuestRoom("guest-1");

  assert.equal(result, room);
  assert.equal(findOneAndUpdateMock.mock.calls.length, 1);

  const [filter, update, options] = findOneAndUpdateMock.mock.calls[0].arguments;
  assert.deepEqual(filter, { guestToken: "guest-1", isGuestSession: true });
  assert.equal(update.$setOnInsert.isGuestSession, true);
  assert.equal(update.$setOnInsert.guestToken, "guest-1");
  assert.ok(update.$setOnInsert.customerId instanceof mongoose.Types.ObjectId);
  assert.deepEqual(options, { new: true, upsert: true });
});
