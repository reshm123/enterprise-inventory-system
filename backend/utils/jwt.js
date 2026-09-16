import jwt from "jsonwebtoken"

export const genearetToken=(users)=>{

    const payload={
        id:users._id.toString(),
        role:users.role,
        tokenVersion:users.tokenVersion
    }
    const token=  jwt.sign(payload, process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN || "1d"})
    return token

 }

export const verifyToken=(token)=>{

    const users=jwt.verify(token,process.env.JWT_SECRET);
    return users
 }