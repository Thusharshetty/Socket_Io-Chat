const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    content: String,
    clientOffset: {
        type: String,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);