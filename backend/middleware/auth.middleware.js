import {  verifyToken} from "../utils/jwt.js";
import { findUserById } from "../repositories/user.repository.js"

export const authenticate =async(req,res,next)=>{
    try{
   const authHeader=req.headers.authorization;
   if(!authHeader){
    return res.status(401).json({
        success:false,
        message:"Authentication token is required",
        error:{
            code:"MISSING_TOKEN"
        }
    })
}

if(!authHeader.startsWith("Bearer ")){
  return res.status(401).json({
        success:false,
        message:"Invalid Authorization  format",
        error:{
            code:"INVALID_AUTH_FORMAT"
        }
    })
}
const token=authHeader.split(" ")[1];
const decode=verifyToken(token);
const user=await findUserById(decode.id)
if(!user){
    return res.status(401).json({
        success: false,
        message: "User no longer exists",
        error: {
          code: "USER_NOT_FOUND"
        }
      });
}

if(user.status !== "Active"){
     return res.status(403).json({
        success: false,
        message: "Token has been invalidated",
        error: {
          code: "TOKEN_INVALIDATED"
        }
      });
}

if (decode.tokenVersion !== user.tokenVersion) {
    return res.status(401).json({
        success: false,
        message: "Token has been invalidated",
        error: {
          code: "TOKEN_INVALIDATED"
        }
      });
}

   req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      warehouseIds: user.warehouseIds
    };
    next();
    }catch(error){
  if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
        error: {
          code: "TOKEN_EXPIRED"
        }
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: {
          code: "INVALID_TOKEN"
        }
      });
    }

    next(error);
  }

}