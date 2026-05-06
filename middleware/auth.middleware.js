const jwt = require("jsonwebtoken");
const { createError } = require("../utils/createError");

const verifyMiddleware = (req,res, next) =>{
    try {
        const verifyToken = req.headers["authorization"];
        // if(!verifyToken)
        //     return res.status(401).json({message: "Access Denied: No Token in the headers."});
        const token = verifyToken && verifyToken.split(" ")[1];
        if(!token) throw createError("Access Denied: No Token Provided.",401);
    
        const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = verified;

        next();
    } catch (error) {
        next(error)
    }
}
module.exports = { verifyMiddleware };