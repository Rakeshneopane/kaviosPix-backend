const express = require("express")
const { createError } = require("../utils/createError");
const { ImageModel } = require("../models/image.model");
const joi = require("joi");
const fs = require("fs");
const path = require("path");

const { cloudinary } = require("../utils/uploadExport");

const imageSchemaValidate = joi.object({
    albumId: joi.string().required(),
    name: joi.string().min(3).max(30).required(),
    tags: [joi.string()],
    person: [joi.string()],
    isFavorite: joi.boolean(),
    comments: [joi.string()],
    size: joi.number().required(),
    url: joi.string(),
});

const imageUpload = async(req,res,next)=>{
    try {
        const files = req.files // file type input
        const acceptedName = ["jpeg", "png", "jpg", "webp",]; // accepted file extentions
        
        //validate image
        const { value, error } = imageSchemaValidate.validate(req.body);
        if(error) 
            throw createError( error.details[0].message, 400);

        const uploadCloudImages = await Promise.all(
            files.map(async (file)=>{
                const ext = path.extname(file.originalname).slice(1).toLowerCase();
                if(!acceptedName.includes(ext))
                    throw createError("Client error: File extention not match. Should be jpeg,jpg,png or webp", 400);
                const cloudUpload = await cloudinary.uploader.upload(file.path, {folder: "kavios/upload"});
                const stats = fs.statSync(file.path);
                fs.unlinkSync(file.path);

                return {url: cloudUpload.secure_url, size: stats.size, name: file.originalname };
            })
        )
        const imageDocs = uploadCloudImages.map((img)=>({
            ...value,
            size: img.size,
            url: img.url,
            name: img.name
        }))
        //upload to database
        const uploadedImage = await ImageModel.insertMany(imageDocs);

        if(!uploadedImage.length) {
            throw createError("Server Error: Image Upload Failed", 500)
        }
        
        return res.status(201).json({message: "Image details uploaded to database successfully"});

    } catch (error) {
        next(error);
    }
}

const getImages = async(req, res, next)=>{
    const {albumId} = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        //const {id} = req.params;
        const findImage = await ImageModel.find({albumId}).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments()
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Image found successfully", 
            image: findImage,
            pagination: {
                totalItems: totalImages,
                totalPages: Math.ceil(totalImages/limit),
                currentPage: page 
            }
        });
    } catch (error) {
        next(error);
    }
}

const getParticularImage = async(req, res, next)=>{
    
    try {
        const {imageId} = req.params;
        const findImage = await ImageModel.findById(imageId);
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Image found successfully", image: findImage});
    } catch (error) {
        next(error);
    }
}

const getFavorites = async(req, res, next)=>{
    const {albumId} = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try {
        const findImage = await ImageModel.find({albumId, isFavorite: true}).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments()
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Favorite Image found successfully", 
            image: findImage,
            pagination: {
                totalItems: totalImages,
                totalPages: Math.ceil(totalImages/limit),
                currentPage: page 
            }
        });
    } catch (error) {
        next(error);
    }
}

const imageFilter = async(req, res, next)=>{
    const filter = {};
    if(req.query.tags) filter.tags = {$in: [req.query.tags]}
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;
    try {
        const findImage = await ImageModel.find(filter).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments()
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Favorite Image found successfully", 
            image: findImage,
            pagination: {
                totalItems: totalImages,
                totalPages: Math.ceil(totalImages/limit),
                currentPage: page 
            }
        });
    } catch (error) {
        next(error);
    }
}

const deleteImages = async(req, res, next)=>{
    try {
        const {imageId} = req.params;
        
        const deletedImages =  await ImageModel.findByIdAndDelete(imageId);

        if(!deletedImages ) {
            throw createError("Server Error: Image Deletion failed.",500);
        }
        
        return res.status(200).json({message: "Image deleted successffully", image: deletedImages});

    } catch (error) {
        next(error);
    }
}

const toggleFavorite = async(req, res, next)=>{
    try {
        const {imageId} = req.params;
        
        const findImage =  await ImageModel.findById(imageId);
        if(!findImage ) throw createError("Server Error: Image not found.",404);

        const toggleImage = await ImageModel.findByIdAndUpdate(
            imageId, 
            {$set: {isFavorite: !findImage.isFavorite}}, 
            {new: true}
        );
        if(!toggleImage ) throw createError("Server Error: Toggle failed.",500);
        return res.status(200).json({message: "Toggled successffully", image: toggleImage});

    } catch (error) {
        next(error);
    }
}

const addComment = async(req, res, next)=>{
    try {
        const {imageId} = req.params;
        
        const findImage =  await ImageModel.findById(imageId);

         if(!findImage ) throw createError("Server Error: Image not found.",404);
        
        const addedComments = await ImageModel.findByIdAndUpdate(
            imageId, 
            {$push: {comments: req.body.comment}}, 
            {new: true}
        );
        if(!addedComments ) throw createError("Server Error: comment addition failed.",500);
        
        return res.status(200).json({message: "comments added successffully", image: addedComments});

    } catch (error) {
        next(error);
    }
}

module.exports = { imageUpload, deleteImages, getFavorites, getParticularImage, getImages, addComment, toggleFavorite, imageFilter };