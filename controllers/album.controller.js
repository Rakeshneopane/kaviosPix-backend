const express = require("express");
const { createError } = require("../utils/createError");
const { AlbumModel } = require("../models/album.model");
const { ImageModel } =  require("../models/image.model");

const joi = require("joi");

const ablumSchemaVerify = joi.object({
    name: joi.string().min(3).max(30).required(),
    description: joi.string().optional().allow(""),
    ownerId: joi.string().required(),
    sharedUserIds: joi.array().items(joi.string()).optional()
});

const createAlbum = async(req, res, next)=>{
    try {
        const { name, description, sharedUserIds } = req.body;
        // taking from middleware from  
        const ownerId = req.user._id;
        if(!name || !ownerId){
            throw createError("Name or ownerId are required.", 400);
        }
        const { value, error } = ablumSchemaVerify.validate({
            name, 
            description, 
            ownerId, 
            sharedUserIds: sharedUserIds || []
        }); 
        if(error){
            throw createError(error.details[0].message, 400);
        }
        const newAlbum = await new AlbumModel(value).save();
        // if(!newAlbum){
        //      throw createError("Service not done by database.", 500);
        // }
        return res.status(201).json({
            success: true,
            message: "Album created sucessfully", 
            album: newAlbum
        });        
    } catch (error) {
        next(error);   
    }
};

const updateAlbum = async(req,res,next)=>{
    try {
        const { id } = req.params;
        const ownerId = req.user._id; 

        const existingAlbum = await AlbumModel.findOne({_id: id, ownerId});  
        if(!existingAlbum) throw createError("Album not found or unauthorized", 403); 
        
        const { name, description, sharedUserIds } = req.body;
        if(!name || !id){
            throw createError("Name or ownerId are required.", 400);
        }
   
        const { value, error } = ablumSchemaVerify.validate({name, description, ownerId, sharedUserIds}); 
        if(error){
            throw createError(error.details[0].message, 400);
        }
        
        const updatedAlbum = await AlbumModel.findByIdAndUpdate(id, value, {new: true});
        if(!updatedAlbum) {
            throw createError("Sever error: Updation failed.",500);
        } 
        return res.status(200).json({
            success: true,
            message: "Album updated sucessfully", 
            album: updatedAlbum
        }); 
    } catch (error) {
        next(error);    
    }
};

const deleteAlbum = async(req,res,next)=>{
    try {
        const {id} = req.params;
        const ownerId = req.user._id;

        const existingAlbum = await AlbumModel.findOne({_id: id, ownerId });
        
        if(!existingAlbum) throw createError("No albums found or unauthorised", 403);

        if(existingAlbum.isDefault)
            throw createError("Cannot delete default album. Create another album first.", 400);

        const imagesDeleted =  await ImageModel.deleteMany({albumId: id });
        const deletedAlbum = await AlbumModel.findByIdAndDelete(id);

        if(!deletedAlbum ) {
            throw createError("Server Error: Album Deletion failed.",500);
        }
        
        return res.status(200).json({
            success: true,
            message: "Album deleted successffully", 
            album: deletedAlbum,
            imagesCount: imagesDeleted.deletedCount
        });
    } catch (error) {
       next(error);
    }
};

const getAlbums = async(req,res, next)=>{
    const user = req.user;
    console.log(user);
    const page = parseInt(req.query.page) ?? 1;
    const limit = parseInt(req.query.limit) ?? 5;
    const skip = (page - 1) * limit;
    const ownerId = user._id;
    try {
        const [albumsData, totalAlbum] = await Promise.allSettled([
            AlbumModel.find({ownerId}).skip(skip).limit(limit), 
            AlbumModel.countDocuments({ownerId})
        ]);
        const albums = albumsData.status === "fulfilled" ? albumsData.value : [];
        const total = totalAlbum.status === "fulfilled" ? totalAlbum.value: 0;

        if(albums.length === 0) {
            const defaultAlbum = await AlbumModel.create({
                name: "default", // changed from default Album
                description: "none",
                ownerId,
                sharedUserIds: [],
                isDefault: true, 
            });

            if(!defaultAlbum) 
                throw createError("Unable to create default album", 401);

            return res.status(201).json({
                success: true, 
                message: "Default album created", 
                album: defaultAlbum,
            })
        }
        return res.status(200).json({
            success: true, 
            message: "Fetched the ablums sucessfully",
            albums: albums,
            pagination : {
                totalItems: total,
                totalPages: Math.ceil(total/limit),
                currentPage: page
            }
        });
    } catch (error) {
        next(error);
    }
};

const getParticularAlbum = async(req,res, next)=>{
    const {id} = req.params;
    const ownerId = req.user._id;
    try {
        const albumData = await AlbumModel.findOne({_id: id, ownerId});
        if(!albumData) {
            throw createError("Album not found in the DB.",404);
        }
        return res.status(200).json({
            success: true,
            message: "Fetched the ablums sucessfully",
            album: albumData
        });
    } catch (error) {
        next(error)
    }
};

const shareAlbums = async(req, res, next)=>{
    try {
        const {id} = req.params;
        const ownerId = req.user._id;
        const findAlbum = await AlbumModel.findOne({_id: id, ownerId});
        if(!findAlbum) {
            throw createError("Album not found in the DB.",404);
        }
        // array from frontend
        const sharedUserIds = req.body.sharedUserIds;

        if(!sharedUserIds || !Array.isArray(sharedUserIds)) {
            throw createError("sharedUserIds must be a non-empty array", 400);
        }

        const sharedAblum = await AlbumModel.findByIdAndUpdate(
            id, 
            {$addToSet: {sharedUserIds: {$each: sharedUserIds}}}, 
            {new: true}
        );
        return res.status(200).json({
            success: true,
            message: "Shared the ablum successfully",
            album: sharedAblum
        })
    } catch (error) {
        next(error);
    }
}

module.exports = { 
    createAlbum, 
    updateAlbum, 
    deleteAlbum, 
    getAlbums, 
    getParticularAlbum, 
    shareAlbums 
};
