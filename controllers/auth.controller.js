const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { createError } = require("../utils/createError");

const { UserModel } = require("../models/user.model");
const { AlbumModel } = require("../models/album.model");
const { verifyMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";

const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://image-app-frontend-mu.vercel.app'
  : 'http://localhost:5173';

router.get("/google", (req,res, next)=>{
    try {
        const googleUrl =  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&scope=email profile&response_type=code`;

        res.redirect(googleUrl);
    } catch (error) {
        next(error);
    }
});

router.get("/google/callback", async(req,res, next)=>{
     console.log("FRONTEND_URL:", FRONTEND_URL); 
    try {
        const {code} = req.query;
        if(!code) throw createError("Authorization is not provided.",400);

        const tokenResponse = await axios.post(`https://oauth2.googleapis.com/token`,{
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret : process.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: "authorization_code",
            redirect_uri: process.env.GOOGLE_CALLBACK_URL
        },{
            headers: {"Content-Type": "application/x-www-form-urlencoded"}
        })

        const accessToken = tokenResponse.data.access_token;

        const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
            {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        const { name, email } = userInfo.data;

        const filter = {email};
        const update = {$set : {name}};
        const existingUser = await UserModel.findOneAndUpdate( 
            filter, 
            update, 
            { new: true, upsert: true }
        );

        const {_id} = existingUser;

        const jwtToken = jwt.sign(
            {_id}, 
            process.env.JWT_SECRET_KEY, 
            {expiresIn: '15m'}
        );

        const refreshJWTToken = jwt.sign(
            {_id}, 
            process.env.JWT_REFRESH_SECRET_KEY, 
            {expiresIn: '7d'}
        );

        await UserModel.findByIdAndUpdate(_id,{
            refreshToken: refreshJWTToken
        })

        res.cookie("jwt_token", jwtToken, {  // access token
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000  // 15 minutes
        });
        res.cookie("refresh_token", refreshJWTToken, {  // refresh token
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });
        return res.redirect(`${FRONTEND_URL}/v1/profile/google`);       
    } catch (error) {
        next(error);
    }
});

router.post("/refresh", async(req, res, next)=>{
    try {
        const refreshToken = req.cookies?.refresh_token; 
        if (!refreshToken) throw createError("No refresh token", 401);

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
        
        // verify token exists in DB
        const user = await UserModel.findById(decoded._id);
        if (!user || user.refreshToken !== refreshToken)
            throw createError("Invalid refresh token", 403);

        const accessToken = jwt.sign(
            { _id: decoded._id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '15m' }
        );

        res.cookie("jwt_token", accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000
        });

        return res.json({ message: "Token refreshed successfully" });
    } catch (error) {
        next(error);
    }
})

router.get("/me", verifyMiddleware, async(req,res,next)=>{
    try {
        const user = await UserModel.findById(req.user._id).select("-password");
        if(!user) throw createError("User not found.", 404);

        return res.status(200).json({message: "user found sucessfully", user});
    } catch (error) {
        next(error);
    }
})

router.post("/logout", verifyMiddleware, async(req,res,next)=>{
    try {
        await UserModel.findByIdAndUpdate(req.user._id, { refreshToken: null }); 
        
        res.clearCookie("jwt_token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        res.clearCookie("refresh_token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
        });

        return res.json({message: " Logout successful "});
    } catch (error) {
        next(error);
    }
})
module.exports = router;
