const mongoose = require("mongoose");
const { ChatRoom, ChatMessage } = require("./chat.model");

const findOrCreateRoom = async (customerId) => {
  try {
    return await ChatRoom.findOneAndUpdate(
      { customerId, isGuestSession: false },
      {
        $setOnInsert: {
          customerId,
          isGuestSession: false,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  } catch (error) {
    if (error.code === 11000) {
      return ChatRoom.findOne({ customerId, isGuestSession: false });
    }
    throw error;
  }
};

const findOrCreateGuestRoom = async (guestToken) => {
  try {
    return await ChatRoom.findOneAndUpdate(
      { guestToken, isGuestSession: true },
      {
        $setOnInsert: {
          customerId: new mongoose.Types.ObjectId(),
          isGuestSession: true,
          guestToken,
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  } catch (error) {
    if (error.code === 11000) {
      return ChatRoom.findOne({ guestToken, isGuestSession: true });
    }
    throw error;
  }
};

const findRoomById = async (roomId) => {
  return ChatRoom.findById(roomId);
};

const findRoomByCustomer = async (customerId) => {
  return ChatRoom.findOne({ customerId, isGuestSession: false });
};

const findRoomByGuestToken = async (guestToken) => {
  return ChatRoom.findOne({ guestToken, isGuestSession: true });
};

const listRooms = async ({ page = 1, limit = 20, status, keyword }) => {
  const skip = (page - 1) * limit;
  const filter = {};
  if (status) filter.status = status;

  const [rooms, total] = await Promise.all([
    ChatRoom.find(filter)
      .populate("customerId", "name email avatarUrl")
      .populate("adminId", "name email role")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    ChatRoom.countDocuments(filter),
  ]);

  const decoratedRooms = rooms.map((room) => {
    const plainRoom = room.toObject();
    const guestSuffix = String(plainRoom._id || "").slice(-6).toUpperCase();
    const customerDisplayName =
      plainRoom.customerId?.name ||
      (plainRoom.isGuestSession ? `Guest ${guestSuffix}` : "Unknown user");
    const customerDisplayEmail =
      plainRoom.customerId?.email ||
      (plainRoom.isGuestSession ? "Guest session" : "");

    return {
      ...plainRoom,
      customerDisplayName,
      customerDisplayEmail,
    };
  });

  const filteredRooms = keyword
    ? decoratedRooms.filter((room) => {
        const text = `${room.customerDisplayName || ""} ${room.customerDisplayEmail || ""}`.toLowerCase();
        return text.includes(String(keyword).toLowerCase());
      })
    : decoratedRooms;

  return {
    rooms: filteredRooms,
    total: keyword ? filteredRooms.length : total,
    page,
    totalPages: Math.ceil((keyword ? filteredRooms.length : total) / limit) || 1,
  };
};

const saveMessage = async (messageData) => {
  const message = new ChatMessage(messageData);
  return message.save();
};

const countMessages = async (roomId) => {
  return ChatMessage.countDocuments({ roomId });
};

const getMessages = async (roomId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [messages, total] = await Promise.all([
    ChatMessage.find({ roomId })
      .populate("senderId", "name avatarUrl")
      .sort({ sentAt: -1 })
      .skip(skip)
      .limit(limit),
    ChatMessage.countDocuments({ roomId }),
  ]);
  return {
    messages: messages.reverse(),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

const updateRoomLastMessage = async (roomId, lastMessage) => {
  return ChatRoom.findByIdAndUpdate(
    roomId,
    { lastMessage, updatedAt: new Date() },
    { new: true },
  );
};

const assignAdminToRoom = async (roomId, adminId) => {
  return ChatRoom.findByIdAndUpdate(roomId, { adminId }, { new: true });
};

const attachRoomToCustomer = async (roomId, customerId) => {
  try {
    return await ChatRoom.findByIdAndUpdate(
      roomId,
      {
        customerId,
        isGuestSession: false,
        guestToken: null,
        updatedAt: new Date(),
      },
      { new: true },
    );
  } catch (error) {
    if (error.code === 11000) {
      return ChatRoom.findOne({ customerId, isGuestSession: false });
    }
    throw error;
  }
};

const updateRoomStatus = async (roomId, payload) => {
  return ChatRoom.findByIdAndUpdate(
    roomId,
    { ...payload, updatedAt: new Date() },
    { new: true },
  );
};

const tryAcquireProcessingLock = async (
  roomId,
  lockToken,
  ttlMs = 2 * 60 * 1000,
) => {
  const staleBefore = new Date(Date.now() - ttlMs);

  return ChatRoom.findOneAndUpdate(
    {
      _id: roomId,
      $or: [
        { aiProcessing: { $ne: true } },
        { aiProcessingStartedAt: { $lt: staleBefore } },
      ],
    },
    {
      aiProcessing: true,
      aiProcessingToken: lockToken,
      aiProcessingStartedAt: new Date(),
      updatedAt: new Date(),
    },
    { new: true },
  );
};

const releaseProcessingLock = async (roomId, lockToken) => {
  return ChatRoom.findOneAndUpdate(
    { _id: roomId, aiProcessingToken: lockToken },
    {
      aiProcessing: false,
      aiProcessingToken: null,
      aiProcessingStartedAt: null,
      updatedAt: new Date(),
    },
    { new: true },
  );
};

const getRecentMessages = async (roomId, limit = 10) => {
  return ChatMessage.find({ roomId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  findOrCreateRoom,
  findOrCreateGuestRoom,
  findRoomById,
  findRoomByCustomer,
  findRoomByGuestToken,
  listRooms,
  saveMessage,
  countMessages,
  getMessages,
  getRecentMessages,
  updateRoomLastMessage,
  assignAdminToRoom,
  attachRoomToCustomer,
  updateRoomStatus,
  tryAcquireProcessingLock,
  releaseProcessingLock,
};
