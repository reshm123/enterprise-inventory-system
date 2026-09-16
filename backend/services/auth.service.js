import {findUserByEmail , findUserById , createUser , incrementTokenVersion} from "../repositories/user.repository.js"
import {hashedpassword , passwordcompare} from "../utils/password.js"
import {genearetToken } from "../utils/jwt.js"

export const registerUser=async({
    name,email,password,role
})=>{
    const normalizedemail=email.trim().toLowerCase()
    const existingeamil= await findUserByEmail(normalizedemail);
    if(existingeamil){
     const error=new Error("Email already registered");
    error.statusCode = 409;
    error.code = "DUPLICATE_EMAIL";

    throw error;
    }

    const hashedPassword=await hashedpassword(password);
   const user= await createUser({
    name,email:normalizedemail,password:hashedPassword,role
})
return {
    id:user._id,
    email:user.email,
    role:user.role,
    status:user.status
}

}

export const loginUser=async({email,password})=>{
  const normalizedemail=email.trim().toLowerCase()
    const user= await findUserByEmail(normalizedemail);
     if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";

    throw error;
  }
  if(user.status !=="Active"){
     const error = new Error(`User is ${user.status} `);
    error.statusCode = 409;
    error.code = "ACCOUNT_NOT_ACTIVE";

    throw error;
  }
  
 const ispasswordvalid=await passwordcompare(password,user.password);

 if(!ispasswordvalid){
    
     const error = new Error("Invalid email or password");
    error.statusCode = 401;
    error.code = "INVALID_CREDENTIALS";

    throw error;
  }

  const token=genearetToken(user)
 return {
    token,
   id: user._id,
   name:user.name,
   email:user.email,
   role:user.role,
   status:user.status
 }

}

export const getCurrentUser=async(userId)=>{
const user=await findUserById(userId);
if(!user){
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";

    throw error;
}
return {
    id:user._id,
    name:user.name,
    email:user.email,
    role:user.role,
    status:user.status,
    warehouseIds: user.warehouseIds

}
}

export const logoutUser=async(userId)=>{
await incrementTokenVersion(userId);
return true;
}
