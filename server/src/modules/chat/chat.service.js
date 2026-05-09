const ApiError = require("../../shared/utils/ApiError");
const { claudeChatbotReplyStream } = require("../../shared/services/aiService");
const { getIO } = require("../../config/socket");
const chatRepo = require("./chat.repository");
const productRepo = require("../product/product.repository");
const orderRepo = require("../order/order.repository");

const PRODUCT_INTENT_KEYWORDS = [
  "mua", "tìm", "tìm kiếm", "gợi ý", "giới thiệu", "cần", "muốn",
  "sản phẩm", "áo", "quần", "váy", "đầm", "giày", "dép", "túi",
  "phụ kiện", "hàng", "loại", "có bán", "bán không", "còn không",
  "giá", "rẻ", "sale", "khuyến mãi",
];

const isProductRelated = (message) => {
  const msg = message.toLowerCase();
  return PRODUCT_INTENT_KEYWORDS.some((kw) => msg.includes(kw));
};

const extractProductKeyword = (message) => {
  const stopWords = [
    "tôi", "mình", "bạn", "ơi", "nhé", "không", "có", "và", "với",
    "cho", "của", "được", "một", "những", "các", "là", "ở", "thì",
    "mua", "tìm", "cần", "muốn", "gợi ý", "giới thiệu",
  ];
  const words = message
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.includes(w));
  return words.slice(0, 4).join(" ") || message.slice(0, 30);
};

const RESOLVED_KEYWORDS = [
  "da giai quyet", "đã giải quyết", "ok", "ổn", "cam on",
  "cảm ơn", "yes", "roi", "rồi",
];

const CONTINUE_KEYWORDS = [
  "chua", "chưa", "chua giai quyet", "chưa giải quyết",
  "hoi tiep", "hỏi tiếp", "them", "thêm", "no", "khong", "không",
];

const normalizeText = (value) => String(value || "").toLowerCase().trim();

const emitMessage = (io, roomId, message) => {
  io.to(roomId).emit("newMessage", {
    _id: message._id,
    content: message.content,
    senderRole: message.senderRole,
    type: message.type,
    sentAt: message.sentAt,
  });
};

// In-memory lock: roomIds currently being processed by AI
const processingRooms = new Set();

/**
 * UC-11: Chat
 */

const getOrCreateRoom = async (customerId) => {
  const room = await chatRepo.findOrCreateRoom(customerId);

  if (room.status === "closed") {
    await chatRepo.updateRoomStatus(room._id, {
      status: "active",
      adminId: null,
      awaitingResolutionConfirm: false,
      resolvedAt: null,
      closedAt: null,
      lastMessage: null,
    });
    const welcome = await chatRepo.saveMessage({
      roomId: room._id,
      senderRole: "bot",
      content: "Xin chào! Tôi có thể giúp gì cho bạn?",
      type: "status",
    });
    await chatRepo.updateRoomLastMessage(room._id, welcome.content);
    return { ...room.toObject(), status: "active" };
  }

  const messageCount = await chatRepo.countMessages(room._id);
  if (messageCount === 0) {
    const welcome = await chatRepo.saveMessage({
      roomId: room._id,
      senderRole: "bot",
      content: "Xin chào! Tôi có thể giúp gì cho bạn?",
      type: "status",
    });
    await chatRepo.updateRoomLastMessage(room._id, welcome.content);
  }

  return room;
};

const sendMessage = async (customerId, roomId, { content }, customerName = "") => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  if (room.status === "closed") {
    throw new ApiError(400, "Phiên chat đã kết thúc. Vui lòng mở phiên chat mới để tiếp tục.");
  }

  if (room.customerId.toString() !== customerId.toString()) {
    throw new ApiError(403, "Bạn không có quyền gửi tin nhắn trong phòng này.");
  }

  if (processingRooms.has(roomId.toString())) {
    throw new ApiError(429, "Bot đang xử lý tin nhắn trước đó. Vui lòng đợi.");
  }

  const normalizedContent = content.trim();

  const customerMessage = await chatRepo.saveMessage({
    roomId,
    senderId: customerId,
    senderRole: "customer",
    content: normalizedContent,
  });

  await chatRepo.updateRoomLastMessage(roomId, normalizedContent);

  const io = getIO();
  emitMessage(io, roomId, customerMessage);

  // Admin đang phụ trách → chờ admin reply
  if (room.adminId) {
    return customerMessage;
  }

  // Đang chờ xác nhận giải quyết
  if (room.awaitingResolutionConfirm) {
    const normalized = normalizeText(normalizedContent);
    const isResolved = RESOLVED_KEYWORDS.some((kw) => normalized.includes(kw));
    const wantsContinue = CONTINUE_KEYWORDS.some((kw) => normalized.includes(kw));

    if (isResolved) {
      const closingMessage = await chatRepo.saveMessage({
        roomId,
        senderRole: "bot",
        content: "Cảm ơn bạn đã xác nhận. Hệ thống sẽ kết thúc phiên chat và lưu trạng thái hoàn tất.",
        type: "status",
      });

      await chatRepo.updateRoomStatus(roomId, {
        status: "closed",
        awaitingResolutionConfirm: false,
        resolvedAt: new Date(),
        closedAt: new Date(),
        lastMessage: closingMessage.content,
      });

      emitMessage(io, roomId, closingMessage);
      return [customerMessage, closingMessage];
    }

    if (wantsContinue) {
      await chatRepo.updateRoomStatus(roomId, {
        status: "active",
        awaitingResolutionConfirm: false,
        resolvedAt: null,
      });

      const continueMessage = await chatRepo.saveMessage({
        roomId,
        senderRole: "bot",
        content: "Mình đã ghi nhận bạn cần hỗ trợ thêm. Bạn hãy mô tả chi tiết vấn đề, chatbot AI sẽ tiếp tục xử lý.",
        type: "status",
      });
      await chatRepo.updateRoomLastMessage(roomId, continueMessage.content);
      emitMessage(io, roomId, continueMessage);
      return [customerMessage, continueMessage];
    }
  }

  // Bot xử lý (streaming)
  const recentMessages = await chatRepo.getRecentMessages(roomId, 12);
  const history = recentMessages.reverse().filter(
    (m) => m._id.toString() !== customerMessage._id.toString(),
  );

  let productContext = [];
  if (isProductRelated(normalizedContent)) {
    const keyword = extractProductKeyword(normalizedContent);
    try {
      const result = await productRepo.findByKeyword(keyword, {}, 1, 4);
      productContext = result.products || [];
      if (productContext.length === 0) {
        const popular = await productRepo.findPopular(1, 4);
        productContext = popular.products || [];
      }
    } catch (_) {
      // Bỏ qua lỗi search
    }
  }

  let orderContext = [];
  try {
    const result = await orderRepo.findOrdersByCustomer(customerId, 1, 5);
    orderContext = result.orders || [];
  } catch (_) {
    // Bỏ qua lỗi
  }

  // Lock room trong lúc AI đang stream
  const roomIdStr = roomId.toString();
  processingRooms.add(roomIdStr);

  // Emit signal bắt đầu stream (tạo placeholder message ở FE)
  io.to(roomId).emit("botStreamStart", { roomId });

  // Chạy streaming bất đồng bộ (không block HTTP response)
  setImmediate(async () => {
    try {
      await claudeChatbotReplyStream(
        normalizedContent,
        history,
        productContext,
        orderContext,
        (chunk) => {
          io.to(roomId).emit("botStreamChunk", { roomId, chunk });
        },
        async (fullText) => {
          if (fullText) {
            // Bot trả lời được
            const botMessage = await chatRepo.saveMessage({
              roomId,
              senderId: null,
              senderRole: "bot",
              content: fullText,
            });

            const resolutionPrompt = await chatRepo.saveMessage({
              roomId,
              senderRole: "bot",
              content: "Thông tin trên đã giải quyết vấn đề của bạn chưa?",
              type: "status",
            });

            await chatRepo.updateRoomStatus(roomId, {
              status: "resolved",
              awaitingResolutionConfirm: true,
              resolvedAt: new Date(),
              closedAt: null,
              lastMessage: resolutionPrompt.content,
            });

            io.to(roomId).emit("botStreamEnd", {
              roomId,
              message: {
                _id: botMessage._id,
                content: botMessage.content,
                senderRole: botMessage.senderRole,
                sentAt: botMessage.sentAt,
              },
            });

            emitMessage(io, roomId, resolutionPrompt);
          } else {
            // Bot không trả lời được → chuyển admin
            const transferMessage = await chatRepo.saveMessage({
              roomId,
              senderRole: "system",
              content: "Chatbot AI chưa tìm được câu trả lời phù hợp. Hệ thống đã ghi nhận và sẽ chuyển yêu cầu đến nhân viên hỗ trợ.",
              type: "status",
            });

            await chatRepo.updateRoomStatus(roomId, {
              status: "active",
              awaitingResolutionConfirm: false,
              resolvedAt: null,
              lastMessage: transferMessage.content,
            });

            io.to(roomId).emit("botStreamEnd", { roomId, message: null });
            emitMessage(io, roomId, transferMessage);
          }
        },
        customerName,
      );
    } catch (err) {
      console.error("[chat.service] Stream error:", err);
      io.to(roomId).emit("botStreamEnd", { roomId, message: null, error: true });
    } finally {
      processingRooms.delete(roomIdStr);
    }
  });

  return customerMessage;
};

const adminSendMessage = async (adminId, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  if (!room.adminId || room.adminId.toString() !== adminId.toString()) {
    throw new ApiError(403, "Bạn không phải admin của phòng này.");
  }

  return chatRepo.saveMessage({
    roomId,
    senderId: adminId,
    senderRole: "admin",
    content: content.trim(),
  });
};

const getMessages = async (customerId, page = 1) => {
  const room = await chatRepo.findRoomByCustomer(customerId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  const data = await chatRepo.getMessages(room._id, page);
  return {
    room: {
      _id: room._id,
      status: room.status,
      awaitingResolutionConfirm: room.awaitingResolutionConfirm,
      resolvedAt: room.resolvedAt,
      closedAt: room.closedAt,
    },
    ...data,
  };
};

const transferToAdmin = async (roomId, adminId) => {
  const room = await chatRepo.assignAdminToRoom(roomId, adminId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  const io = getIO();
  io.to(roomId).emit("adminAssigned", { adminId });

  return room;
};

const listSupportRooms = async ({ page = 1, limit = 20, status, keyword }) => {
  return chatRepo.listRooms({ page, limit, status, keyword });
};

const getRoomMessagesForStaff = async (roomId, page = 1) => {
  const room = await chatRepo.findRoomById(roomId);
  if (!room) throw new ApiError(404, "Không tìm thấy phòng chat.");

  const data = await chatRepo.getMessages(roomId, page);
  return {
    room: {
      _id: room._id,
      customerId: room.customerId,
      adminId: room.adminId,
      status: room.status,
      awaitingResolutionConfirm: room.awaitingResolutionConfirm,
      resolvedAt: room.resolvedAt,
      closedAt: room.closedAt,
      lastMessage: room.lastMessage,
      updatedAt: room.updatedAt,
    },
    ...data,
  };
};

const sendMessageByStaff = async (staffUser, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) throw new ApiError(404, "Không tìm thấy phòng chat.");
  if (room.status === "closed") {
    throw new ApiError(400, "Phiên chat đã kết thúc.");
  }

  if (!room.adminId) {
    await chatRepo.assignAdminToRoom(roomId, staffUser._id);
  } else if (room.adminId.toString() !== staffUser._id.toString()) {
    throw new ApiError(403, "Phòng chat đang được nhân viên khác phụ trách.");
  }

  const message = await chatRepo.saveMessage({
    roomId,
    senderId: staffUser._id,
    senderRole: "admin",
    content: content.trim(),
  });

  await chatRepo.updateRoomStatus(roomId, {
    status: "active",
    awaitingResolutionConfirm: false,
    resolvedAt: null,
    lastMessage: message.content,
  });

  const io = getIO();
  emitMessage(io, roomId, message);

  return message;
};

const assignRoomToStaff = async (roomId, staffUserId) => {
  const room = await chatRepo.findRoomById(roomId);
  if (!room) throw new ApiError(404, "Không tìm thấy phòng chat.");

  const updated = await chatRepo.assignAdminToRoom(roomId, staffUserId);
  const io = getIO();
  io.to(roomId).emit("adminAssigned", { adminId: staffUserId });
  return updated;
};

module.exports = {
  getOrCreateRoom,
  sendMessage,
  adminSendMessage,
  getMessages,
  transferToAdmin,
  listSupportRooms,
  getRoomMessagesForStaff,
  sendMessageByStaff,
  assignRoomToStaff,
};
