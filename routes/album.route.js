const express = require("express");
const albumRouter = express.Router();
const { verifyMiddleware } = require("../middleware/auth.middleware");
const { createAlbum, updateAlbum, deleteAlbum, getAlbums, getParticularAlbum, shareAblums } = require("../controllers/album.controller");
const {isOwner} = require("../utils/isOwner");

albumRouter.get("/all", verifyMiddleware, getAlbums);
albumRouter.get("/:id", verifyMiddleware, getParticularAlbum);
albumRouter.patch("/update/:id", verifyMiddleware, isOwner, updateAlbum);
albumRouter.delete("/delete/:id", verifyMiddleware, isOwner, deleteAlbum);
albumRouter.post("/:id/share", verifyMiddleware, isOwner, shareAblums);
albumRouter.post("/create", verifyMiddleware, createAlbum);

module.exports = { albumRouter };