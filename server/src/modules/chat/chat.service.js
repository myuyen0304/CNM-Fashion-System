const ApiError = require("../../shared/utils/ApiError");
const { claudeChatbotReply } = require("../../shared/services/aiService");
const { getIO } = require("../../config/socket");
const chatRepo = require("./chat.repository");
const productRepo = require("../product/product.repository");

// Từ khóa gợi ý muốn tìm / mua sản phẩm
const PRODUCT_INTENT_KEYWORDS = [
  "mua", "tìm", "tìm kiếm", "gợi ý", "giới thiệu", "cần", "muốn",
  "sản phẩm", "áo", "quần", "váy", "đầm", "giày", "dép", "túi",
  "phụ kiện", "hàng", "loại", "có bán", "bán không", "còn không",
  "giá", "rẻ", "sale", "khuyến mãi",
];

/**
 * Kiểm tra xem tin nhắn có liên quan đến sản phẩm không
 */
const isProductRelated = (message) => {
  const msg = message.toLowerCase();
  return PRODUCT_INTENT_KEYWORDS.some((kw) => msg.includes(kw));
};

/**
 * Trích xuất keyword sản phẩm từ tin nhắn để tìm kiếm
 */
const extractProductKeyword = (message) => {
  // Loại bỏ các stop-word phổ biến, giữ lại danh từ/tính từ
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
  "da giai quyet",
  "đã giải quyết",
  "ok",
  "ổn",
  "cam on",
  "cảm ơn",
  "yes",
  "roi",
  "rồi",
];

const CONTINUE_KEYWORDS = [
  "chua",
  "chưa",
  "chua giai quyet",
  "chưa giải quyết",
  "hoi tiep",
  "hỏi tiếp",
  "them",
  "thêm",
  "no",
  "khong",
  "không",
];

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .trim();

const emitMessage = (io, roomId, message) => {
  io.to(roomId).emit("newMessage", {
    _id: message._id,
    content: message.content,
    senderRole: message.senderRole,
    type: message.type,
    sentAt: message.sentAt,
  });
};

/**
 * UC-11: Chat
 */

const getOrCreateRoom = async (customerId) => {
  const room = await chatRepo.findOrCreateRoom(customerId);

  // Nếu phiên cũ đã đóng → reset để bắt đầu phiên mới
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
      content:
        "Xin chào! Tôi có thể giúp gì cho bạn?",
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
      content:
        "Xin chào! Tôi có thể giúp gì cho bạn?",
      type: "status",
    });
    await chatRepo.updateRoomLastMessage(room._id, welcome.content);
  }

  return room;
};

const sendMessage = async (customerId, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  if (room.status === "closed") {
    throw new ApiError(
      400,
      "Phiên chat đã kết thúc. Vui lòng mở phiên chat mới để tiếp tục.",
    );
  }

  // Kiểm tra quyền
  if (room.customerId.toString() !== customerId.toString()) {
    throw new ApiError(403, "Bạn không có quyền gửi tin nhắn trong phòng này.");
  }

  const normalizedContent = content.trim();

  // Lưu message từ customer
  const customerMessage = await chatRepo.saveMessage({
    roomId,
    senderId: customerId,
    senderRole: "customer",
    content: normalizedContent,
  });

  // Cập nhật lastMessage
  await chatRepo.updateRoomLastMessage(roomId, normalizedContent);

  // Emit socket để admin/UI nhận tin
  const io = getIO();
  emitMessage(io, roomId, customerMessage);

  // Xử lý response (admin hoặc bot)
  if (room.adminId) {
    // Có admin → chờ admin reply (không tự động)
    return customerMessage;
  }

  if (room.awaitingResolutionConfirm) {
    const normalized = normalizeText(normalizedContent);
    const isResolved = RESOLVED_KEYWORDS.some((kw) => normalized.includes(kw));
    const wantsContinue = CONTINUE_KEYWORDS.some((kw) =>
      normalized.includes(kw),
    );

    if (isResolved) {
      const closingMessage = await chatRepo.saveMessage({
        roomId,
        senderRole: "bot",
        content:
          "Cảm ơn bạn đã xác nhận. Hệ thống sẽ kết thúc phiên chat và lưu trạng thái hoàn tất.Cảm ơn bạn đã xác nhận.",
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
        content:
          "Mình đã ghi nhận bạn cần hỗ trợ thêm. Bạn hãy mô tả chi tiết vấn đề, chatbot AI sẽ tiếp tục xử lý.",
        type: "status",
      });
      await chatRepo.updateRoomLastMessage(roomId, continueMessage.content);
      emitMessage(io, roomId, continueMessage);
      return [customerMessage, continueMessage];
    }
  }

  // Không có admin → bot xử lý
  // Lấy lịch sử tin nhắn gần nhất (loại bỏ message vừa lưu)
  const recentMessages = await chatRepo.getRecentMessages(roomId, 12);
  // Sắp xếp tăng dần (getRecentMessages trả về giảm dần)
  const history = recentMessages.reverse().filter(
    (m) => m._id.toString() !== customerMessage._id.toString(),
  );

  // Detect product intent → query DB để đưa vào context
  let productContext = [];
  if (isProductRelated(normalizedContent)) {
    const keyword = extractProductKeyword(normalizedContent);
    try {
      const result = await productRepo.findByKeyword(keyword, {}, 1, 4);
      productContext = result.products || [];
      // Nếu không tìm thấy theo keyword, lấy popular
      if (productContext.length === 0) {
        const popular = await productRepo.findPopular(1, 4);
        productContext = popular.products || [];
      }
    } catch (_) {
      // Bỏ qua lỗi search, vẫn tiếp tục
    }
  }

  const botReply = await claudeChatbotReply(normalizedContent, history, productContext);

  if (botReply) {
    // Bot có thể trả lời
    const botMessage = await chatRepo.saveMessage({
      roomId,
      senderId: null, // Bot không có userId
      senderRole: "bot",
      content: botReply,
    });

    const resolutionPrompt = await chatRepo.saveMessage({
      roomId,
      senderRole: "bot",
      content:
        "Thông tin trên đã giải quyết vấn đề của bạn chưa? Vui lòng trả lời 'đã giải quyết' hoặc 'chưa'.",
      type: "status",
    });

    await chatRepo.updateRoomStatus(roomId, {
      status: "resolved",
      awaitingResolutionConfirm: true,
      resolvedAt: new Date(),
      closedAt: null,
      lastMessage: resolutionPrompt.content,
    });

    emitMessage(io, roomId, botMessage);
    emitMessage(io, roomId, resolutionPrompt);

    return [customerMessage, botMessage, resolutionPrompt];
  }

  // Bot không thể trả lời → chọn admin
  const transferMessage = await chatRepo.saveMessage({
    roomId,
    senderRole: "system",
    content:
      "Chatbot AI chưa tìm được câu trả lời phù hợp. Hệ thống đã ghi nhận và sẽ chuyển yêu cầu đến nhân viên hỗ trợ.",
    type: "status",
  });

  await chatRepo.updateRoomStatus(roomId, {
    status: "active",
    awaitingResolutionConfirm: false,
    resolvedAt: null,
    lastMessage: transferMessage.content,
  });

  emitMessage(io, roomId, transferMessage);
  return [customerMessage, transferMessage];
};

/**
 * Admin gửi tin (thông qua socket)
 */
const adminSendMessage = async (adminId, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  // Kiểm tra admin assign
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

/**
 * Lấy lịch sử tin nhắn
 */
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

/**
 * Chuyển sang admin
 */
const transferToAdmin = async (roomId, adminId) => {
  const room = await chatRepo.assignAdminToRoom(roomId, adminId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  // Emit socket thông báo
  const io = getIO();
  io.to(roomId).emit("adminAssigned", { adminId });

  return room;
};

module.exports = {
  getOrCreateRoom,
  sendMessage,
  adminSendMessage,
  getMessages,
  transferToAdmin,
};
