const { createError } = require("../utils/createError");
const { AlbumModel } = require("../models/album.model");

const isOwner = async( req, res, next)=>{
    try {
        const ownerId = req.user._id;
        const {id} = req.params;
        const findAlbum = await AlbumModel.findById(id);
        if(!findAlbum) throw createError("Album not found", 404);
        if(ownerId.toString() !== findAlbum.ownerId.toString())
            throw createError("Unauthorized user", 403);
        req.album = findAlbum;
        next();
    } catch (error) {
        next(error)
    }
}
module.exports = { isOwner };