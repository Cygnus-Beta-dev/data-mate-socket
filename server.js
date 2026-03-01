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
  console.log(`🟢 Socket connected: ${socket.id}`);
  // USER JOIN
  socket.on("join", ({ userId, name, role }) => {
    socket.join(userId);

    onlineUsers.set(userId, {
      userId,
      socketId: socket.id,
      name,
      role,
    });
    console.log(
      `👤 User joined | Name: ${name} | Role: ${role} | ID: ${userId} | Socket: ${socket.id}`,
    );
    console.log(`🟢 Total online users: ${onlineUsers.size}`);
    io.emit("online-users", Array.from(onlineUsers.values()));
  });

  // JOIN CONVERSATION ROOM
  socket.on("join-conversation", ({ conversationId }) => {
    socket.join(`conversation:${conversationId}`);
    console.log(
      `💬 Socket ${socket.id} joined conversation: ${conversationId}`,
    );
  });
  // TYPING
  socket.on("typing", ({ conversationId, isTyping, userId }) => {
    console.log(
      `⌨️ Typing | User: ${userId} | Conversation: ${conversationId} | Typing: ${isTyping}`,
    );
    socket.to(`conversation:${conversationId}`).emit("user-typing", {
      conversationId,
      userId,
      isTyping,
    });
  });

  // MESSAGE
  socket.on("send-message", (message) => {
    console.log(
      `📨 Message | Conversation: ${message.conversationId} | Sender: ${message.senderId}`,
    );

    io.to(`conversation:${message.conversationId}`).emit("message", message);

    if (message.recipientId) {
      console.log(`➡️ Sending message to recipient: ${message.recipientId}`);
      io.to(String(message.recipientId)).emit("message", message);
    }
  });

  // DISCONNECT
  socket.on("disconnect", (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.id} | Reason: ${reason}`);

    for (const [userId, data] of onlineUsers.entries()) {
      if (data.socketId === socket.id) {
        console.log(
          `❌ User offline | Name: ${data.name} | Role: ${data.role} | ID: ${userId}`,
        );
        onlineUsers.delete(userId);
      }
    }
    console.log(`🟢 Remaining online users: ${onlineUsers.size}`);
    io.emit("online-users", Array.from(onlineUsers.values()));
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("🚀 Socket server running on port 3001");
});
