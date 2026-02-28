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
  console.log("User connected:", socket.id);

  socket.on("join", ({ userId, userRole, name }) => {
    if (!userId) return;

    const uid = String(userId);

    socket.join(uid);

    onlineUsers.set(uid, {
      userId: uid,
      socketId: socket.id,
      userRole: userRole || "USER",
      name: name || "User",
      lastSeen: new Date().toISOString(),
    });

    console.log(
      `User ${uid} (${userRole}) joined. Total online: ${onlineUsers.size}`,
    );

    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  socket.on("join-conversation", ({ conversationId }) => {
    if (!conversationId) return;

    socket.join(`conversation:${conversationId}`);

    console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
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
        console.log(`User ${userId} removed from online users`);
      }
    }
    io.emit("online-users", Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server running on port ${PORT}`);
});
