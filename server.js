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
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ userId }) => {
    socket.join(userId);

    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
    });

    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  socket.on("join-conversation", ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("typing", ({ conversationId, isTyping, userId }) => {
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      conversationId,
      userId,
      isTyping,
    });
  });

  socket.on("send-message", (message) => {
    io.to(`conversation:${message.conversationId}`).emit("message", message);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

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
