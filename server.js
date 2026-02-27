import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://data-mate-khaki.vercel.app"],
    credentials: true,
  }),
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", ({ userId }) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);

    io.emit("online-users", Array.from(onlineUsers.keys()));
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

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
      }
    }

    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
