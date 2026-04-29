const mongoose = require("mongoose"); 

const AlbumSchema = new mongoose.Schema({
 
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    ownerId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    sharedUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }]
},{
    timestamps: true
})

module.exports = {AlbumModel : mongoose.model("Album",AlbumSchema)}