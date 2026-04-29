const mongoose = require("mongoose");

const initializeDB = async()=>{
    try {
        if(mongoose.connection.readyState === 1) return console.log("Database already connected");
    
        const connection = await mongoose.connect(process.env.MONGODB_URI);
        if(connection){
            console.log("Database connected successfully");
        }
    } catch (error) {
        console.error("Error connecting to the database:", error);
    }
}

module.exports = { initializeDB };