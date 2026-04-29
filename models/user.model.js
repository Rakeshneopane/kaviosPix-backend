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
    }
},{
    timestamps: true
});

module.exports = {UserModel: mongoose.model("User", UserSchema)};