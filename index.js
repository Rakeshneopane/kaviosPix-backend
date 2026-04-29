const express = require("express");
const cors = require("cors");
require("dotenv").config();

const {initializeDB} = require("./db.Connection/db.connect");

const { UserModel } = require("./models/user.model");
const { AlbumModel } = require("./models/album.model");
const { ImageModel } = require("./models/image.model");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
initializeDB();

app.get("/", (req,res)=>{
    res.send("Welcome to the Image APp API");
})
app.get("/test-db", async(req,res)=>{
try {
    
    const checkUser = async() => {
        const user = await UserModel.create({
        email: "test-user@gmail.com",
        name: "test-user"
        });

        if(!user){
            console.log("error: error while saving and creating user.");
            return;
            }
        console.log("user: ",user);
        return user;        
    }

    const checkAlbum = async(user) =>{
        const album = await AlbumModel.create({
            name: "test-album",
            description: "test-description",
            ownerId: user._id,
           sharedUser: [],
        });

        if(!album){
            console.log("error: error while saving and creating album.");
            return;
        }
        console.log("album: ",album);
        return album;
    }

    const checkImage = async (user,album)=>{
        const image = await ImageModel.create({
            albumId: album.id,
            name: "test-image",
            tags: [],
            person: [user._id],
            isfavorite: false,
            comments: [],
            size: 3
        });
        if(!image){
            console.log("error: error while saving and creating image.");
            return;
        }
        console.log("image: ", image);  
        return image;     
    }

    const testinguser = await checkUser();
    const testingAlbum = await checkAlbum(testinguser);
    const testingImage = await checkImage(testinguser,testingAlbum);
    console.log("Testing complete. Check database", {
        testinguser,
        testingAlbum,
        testingImage,
    })
}catch(error){
    console.error("error: error in conecting", error)
}
});


app.listen(PORT, ()=>{
    console.log("Server is running on Port: ", PORT);
})