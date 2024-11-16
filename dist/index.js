"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
// In-memory storage for notifications and online users
const notifications = new Map();
const onlineUsers = new Map();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);
    // Handle user authentication
    socket.on("authenticate", (userId) => {
        onlineUsers.set(socket.id, userId);
        socket.join(`user:${userId}`); // Join personal notification room
        // Send any pending notifications
        const userNotifications = notifications.get(userId) || [];
        if (userNotifications.length > 0) {
            socket.emit("pending_notifications", userNotifications);
        }
    });
    socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`User with ID: ${socket.id} joined room: ${room}`);
        // Notify room members
        socket.to(room).emit("user_joined", {
            userId: onlineUsers.get(socket.id),
            timestamp: new Date(),
        });
    });
    socket.on("send_message", (data) => {
        const messageData = Object.assign(Object.assign({}, data), { senderId: data.senderId, timestamp: new Date() });
        // Create notification for room members
        const notification = {
            id: Date.now().toString(),
            type: "room_message",
            content: `New message in ${data.room}: ${data.content.substring(0, 50)}...`,
            senderId: data.senderId,
            roomId: data.room,
            timestamp: new Date(),
        };
        // Send message and notifications
        socket.to(data.room).emit("receive_message", messageData);
        socket.to(data.room).emit("new_notification", notification);
        console.log(`Message sent in room ${data.room}:`, messageData);
    });
    socket.on("typing", (data) => {
        if (data.room) {
            socket.to(data.room).emit("user_typing", {
                user: data.user,
                isTyping: data.isTyping,
            });
        }
        else {
            const dm = [data.senderId, data.receiverId].sort().join("-");
            socket.to(dm).emit("user_typing", {
                senderId: data.senderId,
                isTyping: true,
            });
        }
    });
    socket.on("stop_typing", (data) => {
        if (data.room) {
            socket.to(data.room).emit("user_typing", {
                user: data.user,
                isTyping: false,
            });
        }
        else {
            const dm = [data.senderId, data.receiverId].sort().join("-");
            socket.to(dm).emit("user_typing", {
                senderId: data.senderId,
                isTyping: false,
            });
        }
    });
    socket.on("join_direct", (data) => {
        const dm = [data.senderId, data.receiverId].sort().join("-");
        socket.join(dm);
        console.log(`User ${socket.id} joined DM room: ${dm}`);
    });
    socket.on("send_direct_message", (message) => {
        const dm = [message.senderId, message.receiverId].sort().join("-");
        // Create notification for direct message
        const notification = {
            id: Date.now().toString(),
            type: "direct_message",
            content: `New message from ${message.senderName}: ${message.content.substring(0, 50)}...`,
            senderId: message.senderId,
            timestamp: new Date(),
        };
        // Store notification if receiver is offline
        if (!Array.from(onlineUsers.values()).includes(message.receiverId)) {
            const userNotifications = notifications.get(message.receiverId) || [];
            notifications.set(message.receiverId, [
                ...userNotifications,
                notification,
            ]);
        }
        // Send message and notification
        io.to(dm).emit("receive_direct_message", message);
        io.to(`user:${message.receiverId}`).emit("new_notification", notification);
        console.log(`Direct message sent in DM ${dm}:`, message);
    });
    // Handle notification acknowledgment
    socket.on("mark_notification_read", (notificationId) => {
        const userId = onlineUsers.get(socket.id);
        if (userId) {
            const userNotifications = notifications.get(userId) || [];
            const updatedNotifications = userNotifications.filter((n) => n.id !== notificationId);
            notifications.set(userId, updatedNotifications);
        }
    });
    socket.on("disconnect", () => {
        const userId = onlineUsers.get(socket.id);
        if (userId) {
            onlineUsers.delete(socket.id);
            // Notify relevant users about the disconnection
            io.emit("user_offline", userId);
        }
        console.log(`User Disconnected: ${socket.id}`);
    });
});
// Error handling
io.on("error", (error) => {
    console.error("Socket.IO Error:", error);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
server.listen(3001, () => {
    console.log("SERVER IS RUNNING on port 3001");
});
