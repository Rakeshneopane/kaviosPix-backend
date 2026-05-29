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
        required: true,
        index: true,
    },
    sharedUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    isDefault: {
        type: Boolean,
        default: false,
    }
},{
    timestamps: true
});
//compound index - frequent query together {ownerId  + isDefault}
AlbumSchema.index({ ownerId: 1, isDefault: 1});

//for sorthing by date
AlbumSchema.index({ownerId: 1, createdAt: -1});

module.exports = {AlbumModel : mongoose.model("Album",AlbumSchema)}