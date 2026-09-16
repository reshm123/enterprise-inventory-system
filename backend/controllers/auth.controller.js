import {registerUser ,loginUser , getCurrentUser ,logoutUser } from "../services/auth.service.js"
import {validateRegister ,validateLogin  } from "../validators/auth.validator.js"

export const register=async(req,res,next)=>{
try{
const validatorError=validateRegister(req.body);
if(validatorError){
    return res.status(400).json({success:false, message:validatorError , error:{
        code:"VALIDATION_ERROR"
    }})
}
const user=await registerUser(req.body);
return res.status(201).json({success:true,message:"User created successfully" , data:user})
}catch(error){
next(error)
}
}

export const login=async(req,res,next)=>{
try{
const validatorError=validateLogin(req.body);
if(validatorError){
    return res.status(400).json({success:false, message:validatorError , error:{
        code:"VALIDATION_ERROR"
    }})
}
const result=await loginUser(req.body);
return res.status(200).json({success:true,message:"User login successfully" , data:result})

}catch(error){
next(error)

}
}

export const me=async(req,res,next)=>{
    try{
const result=await getCurrentUser(req.user.id);
return res.status(200).json({success:true,message:"Current user fetch successfully" , data:result})
    }catch(error){
next(error)
    }


}

export const logoutuser=async(req,res,next)=>{
    try{
await logoutUser(req.user.id);
return res.status(200).json({success:true,message:"Logout successful" , data:null})
    }catch(error){
next(error)
    }


}