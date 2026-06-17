const express = require("express")
const { createError } = require("../utils/createError");
const { ImageModel } = require("../models/image.model");
const { AlbumModel } = require("../models/album.model");
const joi = require("joi");
const fs = require("fs");
const path = require("path");

const { cloudinary } = require("../utils/uploadExport");

// joi array checks and added url required
const imageSchemaValidate = joi.object({
    albumId: joi.string().required(),
    tags: joi.array().items(joi.string()).optional(),
    person: joi.array().items(joi.string()).optional(),
    isFavorite: joi.boolean().default(false),
    comments: joi.array().items(joi.string()).optional(),
});

const imageUpload = async(req,res,next)=>{
    try {
        const files = req.files; // file type input
        if (!files || !Array.isArray(files) || files.length === 0) {
            throw createError("Client error: No files provided for upload", 400);
        }
        console.log("files: ", files);
        console.log("req.file:", req.file);   // in case it's treating it as single
        console.log("req.headers['content-type']:", req.headers['content-type']);
        const acceptedName = ["jpeg", "png", "jpg", "webp",]; // accepted file extentions
        console.log(req.body)
        Object.keys(req.body).forEach(key => {
            if(req.body[key] && typeof req.body[key] === "string"){
                if(req.body[key].startsWith("[") || req.body[key].startsWith("{")){
                    try{
                        req.body[key] = JSON.parse(req.body[key]); 
                        console.log(req.body[key]);
                    }
                    catch(e){}
                }
                else if( req.body[key] === "true") 
                    req.body[key] = true;
                else if (req.body[key] === "false")
                     req.body[key] = false;
            }
        })
        //validate image
        const { value, error } = imageSchemaValidate.validate(req.body);
        if(error) 
            throw createError( error.details[0].message, 400);

        // Ownership check: User must own the destination album
        const album = await AlbumModel.findById(value.albumId);
        if (!album) {
            throw createError("Album not found", 404);
        }
        if (album.ownerId.toString() !== req.user._id.toString()) {
            throw createError("Unauthorized: You do not own this album", 403);
        }

        const uploadCloudImages = await Promise.all(
            files.map(async (file)=>{
                const ext = path.extname(file.originalname).slice(1).toLowerCase();
                if(!acceptedName.includes(ext))
                    throw createError("Client error: File extention not match. Should be jpeg,jpg,png or webp", 400);
                const cloudUpload = await cloudinary.uploader.upload(file.path, {folder: "kavios/upload"});
                const stats = fs.statSync(file.path);
                fs.unlinkSync(file.path);

                return {
                    url: cloudUpload.secure_url, 
                    size: stats.size, 
                    name: file.originalname,
                    cloudinaryId: cloudUpload.public_id
                };
            })
        )
        const imageDocs = uploadCloudImages.map((img)=>({
            ...value,
            size: img.size,
            url: img.url,
            name: img.name,
            cloudinaryId: img.cloudinaryId
            
        }))
        //upload to database
        const uploadedImage = await ImageModel.insertMany(imageDocs);

        if(!uploadedImage.length) {
            throw createError("Server Error: Image Upload Failed", 500)
        }
        
        return res.status(201).json({
            message: "Image details uploaded to database successfully",
            images: uploadedImage
        });

    } catch (error) {
        next(error);
    }
}

const getImages = async(req, res, next)=>{
    const { albumId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    try {
        const album = await AlbumModel.findById(albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this album", 403);
        }

        const findImage = await ImageModel.find({albumId}).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments({albumId})
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Image found successfully", 
            images: findImage,
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
        const { imageId } = req.params;
        const findImage = await ImageModel.findById(imageId);
        if(!findImage) throw createError("Image not found", 404);

        const album = await AlbumModel.findById(findImage.albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this image", 403);
        }

        return res.status(200).json({message: "Image found successfully", image: findImage});
    } catch (error) {
        next(error);
    }
}

const getFavorites = async(req, res, next)=>{
    const { albumId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    try {
        const album = await AlbumModel.findById(albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this album", 403);
        }

        const findImage = await ImageModel.find({albumId, isFavorite: true}).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments({ albumId, isFavorite: true })
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
    const { albumId } = req.params;
    const filter = { albumId };
    if(req.query.tags) filter.tags = {$in: [req.query.tags]}
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    try {
        const album = await AlbumModel.findById(albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this album", 403);
        }

        const findImage = await ImageModel.find(filter).skip(skip).limit(limit);
        const totalImages = await ImageModel.countDocuments(filter)
        if(!findImage) throw createError("Image not found", 404);
        return res.status(200).json({message: "Images filtered successfully", 
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

        const image = await ImageModel.findById(imageId);
        if(!image) {
            throw createError("Image not found", 404);
        }

        const album = await AlbumModel.findById(image.albumId);
        if (!album) {
            throw createError("Album not found", 404);
        }
        if (album.ownerId.toString() !== req.user._id.toString()) {
            throw createError("Unauthorized: You do not own the album containing this image", 403);
        }

        if(image.cloudinaryId) {
            await cloudinary.uploader.destroy(image.cloudinaryId);
        }
        
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

        const album = await AlbumModel.findById(findImage.albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this image", 403);
        }

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

        const album = await AlbumModel.findById(findImage.albumId);
        if (!album) throw createError("Album not found", 404);
        if (album.ownerId.toString() !== req.user._id.toString() && !album.sharedUserIds.map(id => id.toString()).includes(req.user._id.toString())) {
            throw createError("Unauthorized: You do not have access to this image", 403);
        }
        
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