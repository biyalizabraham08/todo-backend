const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        minlength: 3
    },
    completed: {
        type: Boolean,
        default: false
    },
    dueDate: {
        type: Date,
        default: null
    },
    attachments: [{
        originalName: String,
        filename: String,
        publicId: String,
        path: String,
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now }
    }],
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Todo", todoSchema);