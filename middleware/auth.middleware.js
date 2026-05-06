const jwt = require("jsonwebtoken");

const verifyMiddleware = (req,res, next) =>{
    const verifyToken = req.headers["authorization"];
    // if(!verifyToken)
    //     return res.status(401).json({message: "Access Denied: No Token in the headers."});
    const token = verifyToken && verifyToken.split(" ")[1];
    if(!token)
        return res.status(401).json({message: "Access Denied: No Token Provided."});
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user = verified;

        next();
    } catch (error) {
        throw new Error(error.message);
    }
}
module.exports = verifyMiddleware;