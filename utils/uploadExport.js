const multer = require("multer");
const cloudinary = require("cloudinary").v2;

//cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
});

// store in cloud
const storage = multer.diskStorage({});

const upload = multer({
    storage,
    limit: { fileSize: 1024 * 1024 * 5 },
});


module.exports = { upload, cloudinary }