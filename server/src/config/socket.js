const { Server } = require("socket.io");

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join a chat room
    socket.on("joinRoom", (roomId) => {
      const normalizedRoomId = String(roomId || "");
      if (!normalizedRoomId) return;

      socket.join(normalizedRoomId);
      console.log(`Socket ${socket.id} joined room ${normalizedRoomId}`);
    });

    // Leave a chat room
    socket.on("leaveRoom", (roomId) => {
      const normalizedRoomId = String(roomId || "");
      if (!normalizedRoomId) return;

      socket.leave(normalizedRoomId);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

module.exports = { initSocket, getIO };
