const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const Message = require("./models/Message");
const mongoose = require("mongoose");

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

async function connectToMongo() {
    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/socket_chat");
        console.log("Connected to MongoDB");
    } catch (err) {
        console.log("Connection Error:", err);
    }
}

connectToMongo();

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

io.on("connection", async (socket) => {
    console.log("a user connected");

    // RECOVERY LOGIC: Send only missed messages
    if (!socket.recovered) {
        try {
            const serverOffset = socket.handshake.auth.serverOffset;

            // Only use the offset if it's a valid MongoDB ObjectId string
            const isValidId = mongoose.Types.ObjectId.isValid(serverOffset);
            const query = isValidId ? { _id: { $gt: serverOffset } } : {};

            const messages = await Message.find(query).sort({ _id: 1 });

            messages.forEach((message) => {
                socket.emit("chat message", message.content, message._id);
            });
        } catch (err) {
            console.log("Sync Error:", err);
        }
    }

    socket.on("chat message", async (msg) => {
        try {
            const message = new Message({ content: msg });
            const savedMessage = await message.save();

            // IMPORTANT: Emit the content AND the new _id to all clients
            io.emit("chat message", savedMessage.content, savedMessage._id);
        } catch (err) {
            console.log("Save Error:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
    });
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});
