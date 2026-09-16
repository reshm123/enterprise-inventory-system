
export const successResponse=(res,statuscode,message,data=null)=>{
   return res.status(statuscode).json({success:true, message,data})

}

export const errorResponse=(res,statuscode,message,code=null)=>{
   return res.status(statuscode).json({success:false, message,error:code? {code }:null})

}