const express = require("express");
const jwt = require("jsonwebtoken");
const axios = require("axios");

const { UserModel } = require("../models/user.model");

const router = express.Router();

router.get("/auth/google", (req,res)=>{
    try {
        const googleUrl =  `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_CALLBACK_URL}&scope=email profile&response_type=code`;

        res.redirect(googleUrl);
    } catch (error) {
        throw new Error(error.message);
    }
});

router.get("/auth/google/callback", async(req,res)=>{
    try {
        const {code} = req.query;
        if(!code) return res.status(400).send("Authorization is not provided.");

        let accessToken;

        try {
            const tokenResponse = await axios.post(`https://oauth2.googleapis.com/token`,{
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret : process.env.GOOGLE_CLIENT_SECRET,
                code,
                grant_type: "authorization_code",
                redirect_uri: process.env.GOOGLE_CALLBACK_URL
            },{
                headers: {"Content-Type": "application/x-www-form-urlencoded"}
            })

            accessToken = tokenResponse.data.access_token;

            res.cookie("access_token", accessToken, {
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            });


            const userInfo = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo",
                {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
            const { name, email } = userInfo.data;

            const filter = {email};
            const update = {$set : {name}};
            const existingUser = await UserModel.findOneAndUpdate( filter, update, {
                new: true,
                upsert: true,
            });

            const {_id} = existingUser;

            const jwtToken = jwt.sign(
                {_id}, 
                process.env.SECRET_KEY, 
                {expiresIn: '1h'}
            );

            res.cookie("jwt_token", jwtToken,{
                httpOnly: true,
                secure: true,
                sameSite: "strict"
            })
            return res.redirect(`${process.env.FRONTEND_URL}/v1/profile/google`);
        } catch (error) {
            console.log("Error while accessing token", ()=>{throw new Error(error.message)})            
        }        
    } catch (error) {
        throw new Error(error.message);
    }
});

module.exports = router;
