const { randomUUID } = require("crypto");
const ApiError = require("../../shared/utils/ApiError");
const { claudeChatbotReplyStream } = require("../../shared/services/aiService");
const { getIO } = require("../../config/socket");
const chatRepo = require("./chat.repository");
const productRepo = require("../product/product.repository");
const orderRepo = require("../order/order.repository");
const {
  isProductRelated,
  extractProductKeyword,
  isResolvedResponse,
  isContinueResponse,
  guestIntentRequiresLogin,
} = require("./chat.utils");

const WELCOME_MESSAGE =
  "Xin chào! Tôi có thể hỗ trợ sản phẩm, size, giá và chính sách cho bạn.";
const CLOSED_MESSAGE =
  "Phiên chat đã kết thúc. Vui lòng mở phiên chat mới để tiếp tục.";
const GUEST_LOGIN_PROMPT =
  "Bạn có thể hỏi về sản phẩm và chính sách ngay trong khung chat này. Để kiểm tra đơn hàng, đổi trả, thanh toán hoặc tài khoản của riêng bạn, vui lòng đăng nhập.";
const GUEST_HANDOFF_PROMPT =
  "Nội dung này cần tài khoản để tiếp tục với nhân viên hỗ trợ. Vui lòng đăng nhập nếu bạn muốn xử lý đơn hàng, đổi trả hoặc thông tin cá nhân.";
const AUTH_USER_HANDOFF_PROMPT =
  "Chatbot AI chưa tìm được câu trả lời phù hợp. Hệ thống sẽ chuyển yêu cầu đến nhân viên hỗ trợ.";

const processingRooms = new Set();

const toPlainRoom = (room) => (room?.toObject ? room.toObject() : room);

const emitMessage = (io, roomId, message) => {
  io.to(roomId).emit("newMessage", {
    _id: message._id,
    content: message.content,
    senderRole: message.senderRole,
    type: message.type,
    sentAt: message.sentAt,
  });
};

const buildActor = ({ user, guestToken }) => {
  if (user?._id) {
    return {
      kind: "authenticated",
      customerId: user._id,
      customerName: user.name || "",
      guestToken: guestToken || "",
      senderId: user._id,
    };
  }

  if (!guestToken) {
    throw new ApiError(400, "Phiên chat của khách vãng lai chưa được khởi tạo.");
  }

  return {
    kind: "guest",
    guestToken,
    customerName: "",
    senderId: null,
  };
};

const ensureRoomReady = async (room) => {
  let currentRoom = room;

  if (currentRoom.status === "closed") {
    currentRoom = await chatRepo.updateRoomStatus(currentRoom._id, {
      status: "active",
      adminId: null,
      awaitingResolutionConfirm: false,
      resolvedAt: null,
      closedAt: null,
      lastMessage: null,
    });

    const welcome = await chatRepo.saveMessage({
      roomId: currentRoom._id,
      senderRole: "bot",
      content: WELCOME_MESSAGE,
      type: "status",
    });
    await chatRepo.updateRoomLastMessage(currentRoom._id, welcome.content);
    return currentRoom;
  }

  const messageCount = await chatRepo.countMessages(currentRoom._id);
  if (messageCount === 0) {
    const welcome = await chatRepo.saveMessage({
      roomId: currentRoom._id,
      senderRole: "bot",
      content: WELCOME_MESSAGE,
      type: "status",
    });
    await chatRepo.updateRoomLastMessage(currentRoom._id, welcome.content);
  }

  return currentRoom;
};

const buildRoomResponse = (room) => {
  const plainRoom = toPlainRoom(room);
  return plainRoom.isGuestSession
    ? { ...plainRoom, guestSessionToken: plainRoom.guestToken }
    : plainRoom;
};

const getOrCreateRoom = async ({ user, guestToken }) => {
  let room;

  if (user?._id) {
    room = await chatRepo.findRoomByCustomer(user._id);

    if (!room && guestToken) {
      const guestRoom = await chatRepo.findRoomByGuestToken(guestToken);
      if (guestRoom) {
        room = await chatRepo.attachRoomToCustomer(guestRoom._id, user._id);
      }
    }

    if (!room) {
      room = await chatRepo.findOrCreateRoom(user._id);
    }
  } else {
    const sessionToken = guestToken || randomUUID();
    room = await chatRepo.findOrCreateGuestRoom(sessionToken);
  }

  const readyRoom = await ensureRoomReady(room);
  return buildRoomResponse(readyRoom);
};

const resolveRoomForActor = async (roomId, actor) => {
  let room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  if (
    actor.kind === "authenticated" &&
    room.isGuestSession &&
    actor.guestToken &&
    room.guestToken === actor.guestToken
  ) {
    const existingCustomerRoom = await chatRepo.findRoomByCustomer(actor.customerId);
    if (!existingCustomerRoom || String(existingCustomerRoom._id) === String(room._id)) {
      room = await chatRepo.attachRoomToCustomer(room._id, actor.customerId);
    }
  }

  return room;
};

const assertRoomAccess = (room, actor) => {
  if (room.isGuestSession) {
    if (!actor.guestToken || room.guestToken !== actor.guestToken) {
      throw new ApiError(403, "Bạn không có quyền truy cập phòng chat này.");
    }
    return;
  }

  if (
    actor.kind !== "authenticated" ||
    room.customerId.toString() !== actor.customerId.toString()
  ) {
    throw new ApiError(403, "Bạn không có quyền truy cập phòng chat này.");
  }
};

const createSystemMessage = async (roomId, content, type = "status") => {
  const message = await chatRepo.saveMessage({
    roomId,
    senderRole: "system",
    content,
    type,
  });
  await chatRepo.updateRoomLastMessage(roomId, message.content);
  return message;
};

const handleResolutionDecision = async (actor, roomId, resolved) => {
  const room = await resolveRoomForActor(roomId, actor);
  assertRoomAccess(room, actor);

  if (room.status === "closed") {
    throw new ApiError(400, CLOSED_MESSAGE);
  }

  const customerMessage = await chatRepo.saveMessage({
    roomId,
    senderId: actor.senderId,
    senderRole: "customer",
    content: resolved ? "Đã giải quyết" : "Hỏi thêm",
  });

  await chatRepo.updateRoomLastMessage(roomId, customerMessage.content);

  const io = getIO();
  emitMessage(io, roomId, customerMessage);

  if (resolved) {
    const closingMessage = await chatRepo.saveMessage({
      roomId,
      senderRole: "bot",
      content: "Cảm ơn bạn đã xác nhận. Hệ thống sẽ kết thúc phiên chat.",
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

  await chatRepo.updateRoomStatus(roomId, {
    status: "active",
    awaitingResolutionConfirm: false,
    resolvedAt: null,
  });

  const continueMessage = await chatRepo.saveMessage({
    roomId,
    senderRole: "bot",
    content: "Mình đã ghi nhận bạn cần hỗ trợ thêm. Bạn hãy mô tả chi tiết hơn để chatbot tiếp tục xử lý.",
    type: "status",
  });

  await chatRepo.updateRoomLastMessage(roomId, continueMessage.content);
  emitMessage(io, roomId, continueMessage);
  return [customerMessage, continueMessage];
};

const sendMessage = async (actorPayload, roomId, { content }) => {
  const actor = buildActor(actorPayload);

  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await resolveRoomForActor(roomId, actor);
  assertRoomAccess(room, actor);

  if (room.status === "closed") {
    throw new ApiError(400, CLOSED_MESSAGE);
  }

  if (processingRooms.has(roomId.toString())) {
    throw new ApiError(429, "Bot đang xử lý tin nhắn trước đó. Vui lòng đợi.");
  }

  const normalizedContent = content.trim();

  const customerMessage = await chatRepo.saveMessage({
    roomId,
    senderId: actor.senderId,
    senderRole: "customer",
    content: normalizedContent,
  });

  await chatRepo.updateRoomLastMessage(roomId, normalizedContent);

  const io = getIO();
  emitMessage(io, roomId, customerMessage);

  if (room.adminId) {
    return customerMessage;
  }

  if (room.awaitingResolutionConfirm) {
    if (isResolvedResponse(normalizedContent)) {
      return handleResolutionDecision(actor, roomId, true);
    }
    if (isContinueResponse(normalizedContent)) {
      return handleResolutionDecision(actor, roomId, false);
    }
  }

  if (actor.kind === "guest" && guestIntentRequiresLogin(normalizedContent)) {
    const loginMessage = await createSystemMessage(
      roomId,
      GUEST_LOGIN_PROMPT,
      "auth_required",
    );
    emitMessage(io, roomId, loginMessage);
    return {
      messages: [customerMessage, loginMessage],
      requiresLogin: true,
    };
  }

  const recentMessages = await chatRepo.getRecentMessages(roomId, 12);
  const history = recentMessages
    .reverse()
    .filter((message) => message._id.toString() !== customerMessage._id.toString());

  let productContext = [];
  if (isProductRelated(normalizedContent)) {
    const keyword = extractProductKeyword(normalizedContent);
    try {
      const result = await productRepo.findByKeyword(keyword, {}, 1, 4);
      productContext = result.products || [];
      if (productContext.length === 0) {
        const fallback = await productRepo.findPopular(1, 4);
        productContext = fallback.products || [];
      }
    } catch (_) {
      productContext = [];
    }
  }

  let orderContext = [];
  if (actor.kind === "authenticated") {
    try {
      const result = await orderRepo.findOrdersByCustomer(actor.customerId, 1, 5);
      orderContext = result.orders || [];
    } catch (_) {
      orderContext = [];
    }
  }

  const roomIdStr = roomId.toString();
  processingRooms.add(roomIdStr);
  io.to(roomId).emit("botStreamStart", { roomId });

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
                type: botMessage.type,
                sentAt: botMessage.sentAt,
              },
            });

            emitMessage(io, roomId, resolutionPrompt);
            return;
          }

          const fallbackMessage = await createSystemMessage(
            roomId,
            actor.kind === "guest" ? GUEST_HANDOFF_PROMPT : AUTH_USER_HANDOFF_PROMPT,
            actor.kind === "guest" ? "auth_required" : "status",
          );

          await chatRepo.updateRoomStatus(roomId, {
            status: "active",
            awaitingResolutionConfirm: false,
            resolvedAt: null,
            lastMessage: fallbackMessage.content,
          });

          io.to(roomId).emit("botStreamEnd", { roomId, message: null });
          emitMessage(io, roomId, fallbackMessage);
        },
        actor.customerName,
      );
    } catch (error) {
      console.error("[chat.service] Stream error:", error);
      io.to(roomId).emit("botStreamEnd", {
        roomId,
        message: null,
        error: true,
      });
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

const getMessages = async (actorPayload, roomId, page = 1) => {
  const actor = buildActor(actorPayload);
  const room = await resolveRoomForActor(roomId, actor);
  assertRoomAccess(room, actor);

  const data = await chatRepo.getMessages(room._id, page);
  return {
    room: {
      _id: room._id,
      status: room.status,
      awaitingResolutionConfirm: room.awaitingResolutionConfirm,
      resolvedAt: room.resolvedAt,
      closedAt: room.closedAt,
      isGuestSession: room.isGuestSession,
    },
    ...data,
  };
};

const confirmResolution = async (actorPayload, roomId, resolved) => {
  const actor = buildActor(actorPayload);
  return handleResolutionDecision(actor, roomId, resolved);
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
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

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
      isGuestSession: room.isGuestSession,
    },
    ...data,
  };
};

const sendMessageByStaff = async (staffUser, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, "Nội dung tin nhắn không được để trống.");
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }
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
  if (!room) {
    throw new ApiError(404, "Không tìm thấy phòng chat.");
  }

  const updated = await chatRepo.assignAdminToRoom(roomId, staffUserId);
  const io = getIO();
  io.to(roomId).emit("adminAssigned", { adminId: staffUserId });
  return updated;
};

module.exports = {
  getOrCreateRoom,
  sendMessage,
  confirmResolution,
  adminSendMessage,
  getMessages,
  transferToAdmin,
  listSupportRooms,
  getRoomMessagesForStaff,
  sendMessageByStaff,
  assignRoomToStaff,
};
