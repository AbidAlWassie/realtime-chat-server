"use strict";
// server/index.ts
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
const io = new socket_io_1.Server(server, {
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
        const messageData = Object.assign(Object.assign({}, data), { senderId: data.senderId });
        console.log(`Message sent in room ${data.room}:`, messageData);
        // Emit to everyone in the specified room
        io.to(data.room).emit("receive_message", messageData);
    });
    socket.on("disconnect", () => {
        console.log(`User Disconnected: ${socket.id}`);
    });
});
server.listen(3001, () => {
    console.log("SERVER IS RUNNING on port 3001");
});
