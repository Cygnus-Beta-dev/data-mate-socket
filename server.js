import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://data-mate-khaki.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("join", ({ userId, name, role }) => {
    socket.join(userId);
    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      name,
      role,
    });
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  socket.on("join-conversation", ({ conversationId }) => {
    if (!conversationId) return;
    socket.join(`conversation:${conversationId}`);
    console.log(`Socket joined conversation: ${conversationId}`);
  });

  socket.on("typing", ({ conversationId, isTyping, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      conversationId,
      userId,
      isTyping,
    });
  });

  socket.on("send-message", (message) => {
    if (!message?.conversationId) return;
    io.to(`conversation:${message.conversationId}`).emit("message", message);
    if (message.recipientId) {
      io.to(String(message.recipientId)).emit("message", message);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Disconnected:", socket.id, "Reason:", reason);
    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }
    io.emit("online-users", Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});
