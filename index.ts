import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);
  });

  socket.on("send_message", (data) => {
    const messageData = {
      ...data,
      senderId: data.senderId,
    };
    console.log(`Message sent in room ${data.room}:`, messageData);
    io.to(data.room).emit("receive_message", messageData);
  });

  // Handle room typing indicators
  socket.on("typing", (data) => {
    if (data.room) {
      // For group chats
      socket.to(data.room).emit("user_typing", {
        user: data.user,
        isTyping: data.isTyping,
      });
    } else {
      // For direct messages
      const dm = [data.senderId, data.receiverId].sort().join("-");
      socket.to(dm).emit("user_typing", {
        senderId: data.senderId,
        isTyping: true,
      });
    }
  });

  // Handle stop typing
  socket.on("stop_typing", (data) => {
    if (data.room) {
      // For group chats
      socket.to(data.room).emit("user_typing", {
        user: data.user,
        isTyping: false,
      });
    } else {
      // For direct messages
      const dm = [data.senderId, data.receiverId].sort().join("-");
      socket.to(dm).emit("user_typing", {
        senderId: data.senderId,
        isTyping: false,
      });
    }
  });

  // Handle direct message room joining
  socket.on("join_direct", (data) => {
    const dm = [data.senderId, data.receiverId].sort().join("-");
    socket.join(dm);
    console.log(`User ${socket.id} joined DM room: ${dm}`);
  });

  // Handle direct messages
  socket.on("send_direct_message", (message) => {
    const dm = [message.senderId, message.receiverId].sort().join("-");
    io.in(dm).emit("receive_direct_message", message);
    console.log(`Direct message sent in DM ${dm}:`, message);
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING");
});
