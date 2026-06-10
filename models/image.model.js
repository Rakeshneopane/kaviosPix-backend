const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
    
    albumId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Album",
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
    },
    tags:{
        type: [String],
        default: [],
        index: true, 
    },
    person :{
        type: [String],
        default: [],
    },
    isFavorite: {
        type: Boolean,
        default: false,
        index: true,
    },
    comments: {
        type: [String],
        default: [],
    },
    size: {
        type: Number,
        required: true,
    },
    url:{
        type: String,
        required: true,
    },
    cloudinaryId: {  
        type: String,
        required: true,
        unique: true,
    }
},{
    timestamps: true
})

ImageSchema.index({ albumId: 1, createdAt: -1 });
ImageSchema.index({ albumId: 1, isFavorite: 1 });

module.exports = {ImageModel : mongoose.model("Image",ImageSchema)}