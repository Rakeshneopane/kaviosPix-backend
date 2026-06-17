const jwt = require("jsonwebtoken");
const { createError } = require("../utils/createError");

const verifyMiddleware = (req,res, next) =>{
    try {
        const token = req.cookies.jwt_token;
        if(!token) throw createError("Access Denied: No Token Provided.",401);
    
        const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = verified;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            next(createError("Access Denied: Invalid or expired token.", 401));
        } else {
            next(error);
        }
    }
}
module.exports = { verifyMiddleware };