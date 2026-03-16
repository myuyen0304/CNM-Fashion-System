const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null = AI bot xử lý
    },
    lastMessage: String,
    status: {
      type: String,
      enum: ["active", "resolved", "closed"],
      default: "active",
    },
    awaitingResolutionConfirm: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Unique: 1 customer 1 room
chatRoomSchema.index({ customerId: 1 }, { unique: true });

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

// ========================
// CHAT MESSAGE
// ========================
const chatMessageSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  senderRole: {
    type: String,
    enum: ["customer", "admin", "bot", "system"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["text", "image", "status"],
    default: "text",
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

chatMessageSchema.index({ roomId: 1, sentAt: -1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

module.exports = { ChatRoom, ChatMessage };
