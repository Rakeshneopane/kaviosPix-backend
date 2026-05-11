const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { initializeDB } = require("./db.Connection/db.connect");
const { errorHandler } = require("./middleware/errorHandler");
const { albumRouter } = require("./routes/album.route");
const { imageRouter } = require("./routes/image.route");

const router = require("./controllers/auth.controller");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
initializeDB();

app.get("/", (req,res)=>{
    res.send("Welcome to the Image APp API");
})

app.use("/auth", router);

app.use("/album", albumRouter);
app.use("/image", imageRouter);

app.use(errorHandler);

app.listen(PORT, ()=>{
    console.log("Server is running on Port: ", PORT);
})