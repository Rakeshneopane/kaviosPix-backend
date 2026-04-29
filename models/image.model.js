const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
    
    albumId: {
        type: mongoose.Schema.Types.ObjectId,
    ref: "Album",
    required: true
    },
    name: {
        type: String,
        required: true,
    },
    tags:{
        type: [String],
        default: [],
    },
    person :{
        type: [String],
        default: [],
    },
    isfavorite: {
        type: Boolean,
        default: false,
    },
    comments: {
        type: [String],
        default: [],
    },
    size: {
        type: Number,
        required: true,
    }
},{
    timestamps: true
})

module.exports = {ImageModel : mongoose.model("Image",ImageSchema)}