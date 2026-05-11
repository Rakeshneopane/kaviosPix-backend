const express = require("express");
const { upload } = require("../utils/uploadExport");

const { imageUpload, deleteImages, getFavorites, getParticularImage, getImages, addComment, toggleFavorite, imageFilter } = require("../controllers/image.controller");
const { verifyMiddleware } = require("../middleware/auth.middleware");

const imageRouter = express.Router();

//to uplaod images
imageRouter.post("/upload", verifyMiddleware, upload.array("uploaded-image", 15), imageUpload);

// albumId se favorites
imageRouter.get("/:albumId/images/favorites", verifyMiddleware, getFavorites);

// albumId se filter by tag
imageRouter.get("/:albumId/images/filter", verifyMiddleware, imageFilter);

// albumId se saari images
imageRouter.get("/:albumId/images", verifyMiddleware, getImages);


// specific image
imageRouter.get("/:imageId", verifyMiddleware, getParticularImage);

// toggle favorite
imageRouter.put("/:imageId/toggle", verifyMiddleware, toggleFavorite);

// add comment
imageRouter.post("/:imageId/comment", verifyMiddleware, addComment);

// delete image
imageRouter.delete("/:imageId", verifyMiddleware, deleteImages);


module.exports = { imageRouter }
