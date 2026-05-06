const errorHandler = (error, req, res, next)=>{
    console.log("ERROR STACK:");
    console.log(error.stack);

    if(res.headersSent){
        return next(error);
    }

    res.status(error.statusCode || 500).json({
        success:false,
        message:error.message || "Internal server error"
    });
}

module.exports = {errorHandler};