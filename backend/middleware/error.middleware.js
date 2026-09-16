export const errorHandler=(error, req,res,next)=>{
console.error(error);
const statusCode=error.statusCode || 500;
res.status(statusCode).json({success:false, message:error.message|| "Internal server error" ,  error: {
      code:
        error.code || "INTERNAL_SERVER_ERROR"
    }})
}