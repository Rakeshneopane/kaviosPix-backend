const express = require("express");
const { createError } = require("../utils/createError");
const { AlbumModel } = require("../models/album.model");
const router = express.Router();
const joi = require("joi");

const ablumSchemaVerify = joi.object({
    name: joi.string().min(3).max(30).required(),
    description: joi.string(),
    ownerId: joi.string().alphanum().required(),
    sharedUserIds: [joi.string().alphanum()]
});

const createAlbum = router.post("/create", async(req, res, next)=>{
    try {
        const {name, description, sharedUserIds} = req.body;
        // taking from middleware from  
        const ownerId = req.user._id;
        if(!name || !ownerId){
            throw createError("Name or ownerId are required.", 400);
        }
        const { value, error } = ablumSchemaVerify.validate({name, description, ownerId, sharedUserIds}); 
        if(error){
            throw createError(error.details[0].message, 400);
        }
        const newAlbum = await new AlbumModel(value).save();
        if(!newAlbum){
             throw createError("Service not done by database.", 500);
        }
        return res.status(201).json({message: "Album created sucessfully", album: newAlbum});        
    } catch (error) {
        next(error);   
    }
});

const updateAlbum = router.patch("/:id", async(req,res,next)=>{
    try {
        const { id } = req.params;
        const ownerId = req.user._id; 
        
        const { name, description, ownerId, sharedUserIds } = req.body;
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
        return res.status(200).json({message: "Album updated sucessfully", album: updatedAlbum}) 
    } catch (error) {
        next(error);    
    }
});

const deleteAlbum = router.delete("/:id", async(req,res,next)=>{
    
    try {
        const {id} = req.params;
        
        const deletedAlbum = await AlbumModel.findByIdAndDelete(id);
        if(!deletedAlbum) {
            throw createError("Server Error: Deletion failed.",500);
        }
        return res.status(200).json({message: "Album deleted successffully", album: deletedAlbum});
    } catch (error) {
       next(error);
    }
})

const getAlbums = router.get("/all", async(req,res, next)=>{
    const page = parseInt(req.query.page) ?? 1;
    const limit = parseInt(req.query.limit) ?? 5;
    const skip = (page - 1) * limit;
    try {
        const albumsData = await AlbumModel.find().skip(skip).limit(limit);
        const totalAlbum = await AlbumModel.countDocuments();
        if(albumsData.length === 0) {
            throw createError("Albums not found in the DB.",404);
        }
        return res.status(200).json({
            message: "Fetched the ablums sucessfully",
            albums: albumsData,
            pagination : {
                totalItems: totalAlbum,
                totalPages: Math.ceil(totalAlbum/limit),
                currentPage: page
            }
        });
    } catch (error) {
        next(error);
    }
})
const getParticularAlbum = router.get("/:id", async(req,res, next)=>{
    const {id} = req.params;
    try {
        const albumData = await AlbumModel.findById(id);
        if(!albumData) {
            throw createError("Album not found in the DB.",404);
        }
        return res.status(200).json({
            message: "Fetched the ablums sucessfully",
            albums: albumData
        });
    } catch (error) {
        next(error)
    }
});

module.exports = {createAlbum, updateAlbum, deleteAlbum, getAlbums, getParticularAlbum };
