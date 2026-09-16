export const authorizeRoles=(...allowedRoles)=>{
return (req,res,next)=>{
if(!req.user){
    res.status(401).json({success:false, message:"Auhtntocation required", error:{
        code:"AUTH_REQUIRED"
    }})
}
if(!allowedRoles.includes(req.user.role)){
    return res.status(403).json({success:false,message:"you are not authrozied to perfrom this operator",error:{code:"Forbidden"}})
}
next();
}
}