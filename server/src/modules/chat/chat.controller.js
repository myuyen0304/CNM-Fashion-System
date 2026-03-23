const chatService = require("./chat.service");
const catchAsync = require("../../shared/utils/catchAsync");

const getOrCreateRoom = catchAsync(async (req, res) => {
  const room = await chatService.getOrCreateRoom(req.user._id);
  res.json({ success: true, data: room });
});

const sendMessage = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const result = await chatService.sendMessage(req.user._id, roomId, req.body);
  res.status(201).json({ success: true, data: result });
});

const getMessages = catchAsync(async (req, res) => {
  const result = await chatService.getMessages(
    req.user._id,
    parseInt(req.query.page) || 1,
  );
  res.json({ success: true, data: result });
});

const confirmResolution = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const result = await chatService.sendMessage(req.user._id, roomId, {
    content: req.body.resolved ? "đã giải quyêt" : "chưa",
  });
  res.status(201).json({ success: true, data: result });
});

const transferToAdmin = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const { adminId } = req.body;
  const room = await chatService.transferToAdmin(roomId, adminId);
  res.json({ success: true, data: room });
});

const listSupportRooms = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const rawLimit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const limit = Math.min(rawLimit, 100);

  const data = await chatService.listSupportRooms({
    page,
    limit,
    status: req.query.status,
    keyword: req.query.keyword,
  });

  res.json({ success: true, data });
});

const getRoomMessagesForStaff = catchAsync(async (req, res) => {
  const data = await chatService.getRoomMessagesForStaff(
    req.params.roomId,
    parseInt(req.query.page, 10) || 1,
  );
  res.json({ success: true, data });
});

const sendMessageByStaff = catchAsync(async (req, res) => {
  const message = await chatService.sendMessageByStaff(
    req.user,
    req.params.roomId,
    req.body,
  );
  res.status(201).json({ success: true, data: message });
});

const assignRoomToSelf = catchAsync(async (req, res) => {
  const room = await chatService.assignRoomToStaff(req.params.roomId, req.user._id);
  res.json({ success: true, data: room });
});

module.exports = {
  getOrCreateRoom,
  sendMessage,
  getMessages,
  confirmResolution,
  transferToAdmin,
  listSupportRooms,
  getRoomMessagesForStaff,
  sendMessageByStaff,
  assignRoomToSelf,
};
