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
  guestIntentRequiresLogin,
} = require("./chat.utils");

const WELCOME_MESSAGE =
  "Xin ch\xe0o! T\xf4i c\xf3 th\u1ec3 h\u1ed7 tr\u1ee3 s\u1ea3n ph\u1ea9m, size, gi\xe1 v\xe0 ch\xednh s\xe1ch cho b\u1ea1n.";
const CLOSED_MESSAGE =
  "Phi\xean chat \u0111\xe3 k\u1ebft th\xfac. Vui l\xf2ng m\u1edf phi\xean chat m\u1edbi \u0111\u1ec3 ti\u1ebfp t\u1ee5c.";
const GUEST_LOGIN_PROMPT =
  "B\u1ea1n c\xf3 th\u1ec3 h\u1ecfi v\u1ec1 s\u1ea3n ph\u1ea9m v\xe0 ch\xednh s\xe1ch ngay trong khung chat n\xe0y. \u0110\u1ec3 ki\u1ec3m tra \u0111\u01a1n h\xe0ng, \u0111\u1ed5i tr\u1ea3, thanh to\xe1n ho\u1eb7c t\xe0i kho\u1ea3n c\u1ee7a ri\xeang b\u1ea1n, vui l\xf2ng \u0111\u0103ng nh\u1eadp.";
const GUEST_HANDOFF_PROMPT =
  "N\u1ed9i dung n\xe0y c\u1ea7n t\xe0i kho\u1ea3n \u0111\u1ec3 ti\u1ebfp t\u1ee5c v\u1edbi nh\xe2n vi\xean h\u1ed7 tr\u1ee3. Vui l\xf2ng \u0111\u0103ng nh\u1eadp n\u1ebfu b\u1ea1n mu\u1ed1n x\u1eed l\xfd \u0111\u01a1n h\xe0ng, \u0111\u1ed5i tr\u1ea3 ho\u1eb7c th\xf4ng tin c\xe1 nh\xe2n.";
const AUTH_USER_HANDOFF_PROMPT =
  "Chatbot AI ch\u01b0a t\xecm \u0111\u01b0\u1ee3c c\xe2u tr\u1ea3 l\u1eddi ph\xf9 h\u1ee3p. H\u1ec7 th\u1ed1ng s\u1ebd chuy\u1ec3n y\xeau c\u1ea7u \u0111\u1ebfn nh\xe2n vi\xean h\u1ed7 tr\u1ee3.";
const RESOLVED_LABEL = "\u0110\xe3 gi\u1ea3i quy\u1ebft";
const CONTINUE_LABEL = "H\u1ecfi th\xeam";
const RESOLUTION_PROMPT = "Thong tin tren da giai quyet van de cua ban chua?";
const RESOLUTION_CLOSING_MESSAGE =
  "Cam on ban da xac nhan. He thong se ket thuc phien chat.";
const CONTINUE_SUPPORT_MESSAGE =
  "Minh da ghi nhan ban can ho tro them. Ban hay mo ta chi tiet hon de chatbot tiep tuc xu ly.";
const EMPTY_MESSAGE_ERROR = "Noi dung tin nhan khong duoc de trong.";
const ROOM_NOT_FOUND_ERROR = "Khong tim thay phong chat.";
const ROOM_ACCESS_DENIED_ERROR = "Ban khong co quyen truy cap phong chat nay.";
const GUEST_SESSION_REQUIRED_ERROR =
  "Phien chat cua khach vang lai chua duoc khoi tao.";
const BOT_BUSY_ERROR = "Bot dang xu ly tin nhan truoc do. Vui long doi.";
const ADMIN_ROOM_FORBIDDEN_ERROR = "Ban khong phai admin cua phong nay.";
const STAFF_ROOM_TAKEN_ERROR = "Phong chat dang duoc nhan vien khac phu trach.";
const CLOSED_ROOM_STATUS_MESSAGE = "Phien chat da ket thuc.";

const CHAT_PROCESSING_LOCK_TTL_MS = Number(
  process.env.CHAT_PROCESSING_LOCK_TTL_MS || 2 * 60 * 1000,
);

const toPlainRoom = (room) => (room?.toObject ? room.toObject() : room);

const emitMessage = (io, roomId, message) => {
  io.to(String(roomId)).emit("newMessage", {
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
    throw new ApiError(400, GUEST_SESSION_REQUIRED_ERROR);
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
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
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
    } else {
      room = existingCustomerRoom;
    }
  }

  return room;
};

const assertRoomAccess = (room, actor) => {
  if (room.isGuestSession) {
    if (!actor.guestToken || room.guestToken !== actor.guestToken) {
      throw new ApiError(403, ROOM_ACCESS_DENIED_ERROR);
    }
    return;
  }

  if (
    actor.kind !== "authenticated" ||
    room.customerId.toString() !== actor.customerId.toString()
  ) {
    throw new ApiError(403, ROOM_ACCESS_DENIED_ERROR);
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
  const activeRoomId = room._id;

  if (room.status === "closed") {
    throw new ApiError(400, CLOSED_MESSAGE);
  }

  const customerMessage = await chatRepo.saveMessage({
    roomId: activeRoomId,
    senderId: actor.senderId,
    senderRole: "customer",
    content: resolved ? RESOLVED_LABEL : CONTINUE_LABEL,
  });

  await chatRepo.updateRoomLastMessage(activeRoomId, customerMessage.content);

  const io = getIO();
  emitMessage(io, activeRoomId, customerMessage);

  if (resolved) {
    const closingMessage = await chatRepo.saveMessage({
      roomId: activeRoomId,
      senderRole: "bot",
      content: RESOLUTION_CLOSING_MESSAGE,
      type: "status",
    });

    await chatRepo.updateRoomStatus(activeRoomId, {
      status: "closed",
      awaitingResolutionConfirm: false,
      resolvedAt: new Date(),
      closedAt: new Date(),
      lastMessage: closingMessage.content,
    });

    emitMessage(io, activeRoomId, closingMessage);
    return [customerMessage, closingMessage];
  }

  await chatRepo.updateRoomStatus(activeRoomId, {
    status: "active",
    awaitingResolutionConfirm: false,
    resolvedAt: null,
  });

  const continueMessage = await chatRepo.saveMessage({
    roomId: activeRoomId,
    senderRole: "bot",
    content: CONTINUE_SUPPORT_MESSAGE,
    type: "status",
  });

  await chatRepo.updateRoomLastMessage(activeRoomId, continueMessage.content);
  emitMessage(io, activeRoomId, continueMessage);
  return [customerMessage, continueMessage];
};

const sendMessage = async (actorPayload, roomId, { content }) => {
  const actor = buildActor(actorPayload);

  if (!content || !content.trim()) {
    throw new ApiError(400, EMPTY_MESSAGE_ERROR);
  }

  const room = await resolveRoomForActor(roomId, actor);
  assertRoomAccess(room, actor);
  const activeRoomId = room._id;

  if (room.status === "closed") {
    throw new ApiError(400, CLOSED_MESSAGE);
  }

  const normalizedContent = content.trim();
  const requiresAiProcessing =
    !room.adminId &&
    !(actor.kind === "guest" && guestIntentRequiresLogin(normalizedContent));

  let lockToken = null;
  if (requiresAiProcessing) {
    lockToken = randomUUID();
    const lockedRoom = await chatRepo.tryAcquireProcessingLock(
      activeRoomId,
      lockToken,
      CHAT_PROCESSING_LOCK_TTL_MS,
    );

    if (!lockedRoom) {
      throw new ApiError(429, BOT_BUSY_ERROR);
    }
  }

  try {
    const customerMessage = await chatRepo.saveMessage({
      roomId: activeRoomId,
      senderId: actor.senderId,
      senderRole: "customer",
      content: normalizedContent,
    });

    await chatRepo.updateRoomLastMessage(activeRoomId, normalizedContent);

    const io = getIO();
    emitMessage(io, activeRoomId, customerMessage);

    if (room.adminId) {
      return customerMessage;
    }

    if (room.awaitingResolutionConfirm) {
      await chatRepo.updateRoomStatus(activeRoomId, {
        status: "active",
        awaitingResolutionConfirm: false,
        resolvedAt: null,
      });
    }

    if (actor.kind === "guest" && guestIntentRequiresLogin(normalizedContent)) {
      const loginMessage = await createSystemMessage(
        activeRoomId,
        GUEST_LOGIN_PROMPT,
        "auth_required",
      );
      emitMessage(io, activeRoomId, loginMessage);
      return {
        messages: [customerMessage, loginMessage],
        requiresLogin: true,
      };
    }

    const recentMessages = await chatRepo.getRecentMessages(activeRoomId, 12);
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

    io.to(String(activeRoomId)).emit("botStreamStart", {
      roomId: String(activeRoomId),
    });

    setImmediate(async () => {
      try {
        await claudeChatbotReplyStream(
          normalizedContent,
          history,
          productContext,
          orderContext,
          (chunk) => {
            io.to(String(activeRoomId)).emit("botStreamChunk", {
              roomId: String(activeRoomId),
              chunk,
            });
          },
          async (fullText) => {
            if (fullText) {
              const botMessage = await chatRepo.saveMessage({
                roomId: activeRoomId,
                senderId: null,
                senderRole: "bot",
                content: fullText,
              });

              const resolutionPrompt = await chatRepo.saveMessage({
                roomId: activeRoomId,
                senderRole: "bot",
                content: RESOLUTION_PROMPT,
                type: "status",
              });

              await chatRepo.updateRoomStatus(activeRoomId, {
                status: "resolved",
                awaitingResolutionConfirm: true,
                resolvedAt: new Date(),
                closedAt: null,
                lastMessage: resolutionPrompt.content,
              });

              io.to(String(activeRoomId)).emit("botStreamEnd", {
                roomId: String(activeRoomId),
                message: {
                  _id: botMessage._id,
                  content: botMessage.content,
                  senderRole: botMessage.senderRole,
                  type: botMessage.type,
                  sentAt: botMessage.sentAt,
                },
              });

              emitMessage(io, activeRoomId, resolutionPrompt);
              return;
            }

            const fallbackMessage = await createSystemMessage(
              activeRoomId,
              actor.kind === "guest" ? GUEST_HANDOFF_PROMPT : AUTH_USER_HANDOFF_PROMPT,
              actor.kind === "guest" ? "auth_required" : "status",
            );

            await chatRepo.updateRoomStatus(activeRoomId, {
              status: "active",
              awaitingResolutionConfirm: false,
              resolvedAt: null,
              lastMessage: fallbackMessage.content,
            });

            io.to(String(activeRoomId)).emit("botStreamEnd", {
              roomId: String(activeRoomId),
              message: null,
            });
            emitMessage(io, activeRoomId, fallbackMessage);
          },
          actor.customerName,
        );
      } catch (error) {
        console.error("[chat.service] Stream error:", error);
        io.to(String(activeRoomId)).emit("botStreamEnd", {
          roomId: String(activeRoomId),
          message: null,
          error: true,
        });
      } finally {
        if (lockToken) {
          await chatRepo.releaseProcessingLock(activeRoomId, lockToken);
        }
      }
    });

    return customerMessage;
  } catch (error) {
    if (lockToken) {
      await chatRepo.releaseProcessingLock(activeRoomId, lockToken);
    }
    throw error;
  }
};

const adminSendMessage = async (adminId, roomId, { content }) => {
  if (!content || !content.trim()) {
    throw new ApiError(400, EMPTY_MESSAGE_ERROR);
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
  }

  if (!room.adminId || room.adminId.toString() !== adminId.toString()) {
    throw new ApiError(403, ADMIN_ROOM_FORBIDDEN_ERROR);
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
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
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
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
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
    throw new ApiError(400, EMPTY_MESSAGE_ERROR);
  }

  const room = await chatRepo.findRoomById(roomId);
  if (!room) {
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
  }
  if (room.status === "closed") {
    throw new ApiError(400, CLOSED_ROOM_STATUS_MESSAGE);
  }

  if (!room.adminId) {
    await chatRepo.assignAdminToRoom(roomId, staffUser._id);
  } else if (room.adminId.toString() !== staffUser._id.toString()) {
    throw new ApiError(403, STAFF_ROOM_TAKEN_ERROR);
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
    throw new ApiError(404, ROOM_NOT_FOUND_ERROR);
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
