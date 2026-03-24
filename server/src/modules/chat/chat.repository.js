const { ChatRoom, ChatMessage } = require("./chat.model");

const findOrCreateRoom = async (customerId) => {
  let room = await ChatRoom.findOne({ customerId });
  if (!room) {
    room = await ChatRoom.create({ customerId });
  }
  return room;
};

const findRoomById = async (roomId) => {
  return ChatRoom.findById(roomId);
};

const findRoomByCustomer = async (customerId) => {
  return ChatRoom.findOne({ customerId });
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

  const filteredRooms = keyword
    ? rooms.filter((room) => {
        const text = `${room.customerId?.name || ""} ${room.customerId?.email || ""}`.toLowerCase();
        return text.includes(String(keyword).toLowerCase());
      })
    : rooms;

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

const updateRoomStatus = async (roomId, payload) => {
  return ChatRoom.findByIdAndUpdate(
    roomId,
    { ...payload, updatedAt: new Date() },
    { new: true },
  );
};

/**
 * Lấy N tin nhắn gần nhất (dùng cho AI context)
 */
const getRecentMessages = async (roomId, limit = 10) => {
  return ChatMessage.find({ roomId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  findOrCreateRoom,
  findRoomById,
  findRoomByCustomer,
  listRooms,
  saveMessage,
  countMessages,
  getMessages,
  getRecentMessages,
  updateRoomLastMessage,
  assignAdminToRoom,
  updateRoomStatus,
};
