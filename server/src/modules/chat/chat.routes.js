const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const { requireRole } = require("../../shared/middleware/authMiddleware");
const { ROLES } = require("../../shared/constants");

router.get("/rooms", chatController.getOrCreateRoom);
router.post("/rooms/:roomId/messages", chatController.sendMessage);
router.get("/rooms/:roomId/messages", chatController.getMessages);
router.post("/rooms/:roomId/resolve", chatController.confirmResolution);
router.put("/rooms/:roomId/transfer", chatController.transferToAdmin);

// Staff support routes
router.get(
  "/admin/rooms",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  chatController.listSupportRooms,
);
router.get(
  "/admin/rooms/:roomId/messages",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  chatController.getRoomMessagesForStaff,
);
router.post(
  "/admin/rooms/:roomId/messages",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  chatController.sendMessageByStaff,
);
router.patch(
  "/admin/rooms/:roomId/assign-self",
  requireRole(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.EMPLOYEE),
  chatController.assignRoomToSelf,
);

module.exports = router;
