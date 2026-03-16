const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");

router.get("/rooms", chatController.getOrCreateRoom);
router.post("/rooms/:roomId/messages", chatController.sendMessage);
router.get("/rooms/:roomId/messages", chatController.getMessages);
router.post("/rooms/:roomId/resolve", chatController.confirmResolution);
router.put("/rooms/:roomId/transfer", chatController.transferToAdmin);

module.exports = router;
