const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    name: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
        default: null
    }
},{
    timestamps: true
});

module.exports = {UserModel: mongoose.model("User", UserSchema)};