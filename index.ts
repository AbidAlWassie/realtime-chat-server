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

// Helper function to create consistent room IDs
const createRoomId = (id1: string, id2: string) => [id1, id2].sort().join("-");

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Group Chat Room Events
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

  socket.on("typing", (data) => {
    if (data.room) {
      // Group chat typing
      socket.to(data.room).emit("user_typing", {
        user: data.user,
        isTyping: data.isTyping,
      });
    } else if (data.senderId && data.receiverId) {
      // DM typing
      const roomId = createRoomId(data.senderId, data.receiverId);
      socket.to(roomId).emit("user_typing", {
        senderId: data.senderId,
      });
    }
  });

  socket.on("stop_typing", (data) => {
    if (data.senderId && data.receiverId) {
      const roomId = createRoomId(data.senderId, data.receiverId);
      socket.to(roomId).emit("user_stop_typing", {
        senderId: data.senderId,
      });
    }
  });

  // Direct Message Events
  socket.on("join_direct", (data) => {
    try {
      const roomId = createRoomId(data.senderId, data.receiverId);
      socket.join(roomId);
      console.log(`User ${socket.id} joined DM room: ${roomId}`);
    } catch (error) {
      console.error("Error joining DM room:", error);
    }
  });

  socket.on("send_direct_message", (message) => {
    try {
      const roomId = createRoomId(message.senderId, message.receiverId);
      io.in(roomId).emit("receive_direct_message", message);
      console.log(`Direct message sent in room ${roomId}:`, message);
    } catch (error) {
      console.error("Error sending DM:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

server.listen(3001, () => {
  console.log("SERVER IS RUNNING on port 3001");
});
