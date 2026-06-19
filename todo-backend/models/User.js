const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    resetToken: String,
    resetTokenExpiry: Date,
    plan: {
        type: String,
        enum: ['free', 'premium'],
        default: 'free'
    }
});

module.exports = mongoose.model("User", userSchema);