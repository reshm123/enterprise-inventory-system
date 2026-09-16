import User from "../models/user.model.js"
export const findUserByEmail =async(email)=>{

  return  User.findOne({
        email:email.toLowerCase()
    }).select("+password")
    
}

export const findUserById =async(userId)=>{
return User.findById(userId);

}

export const createUser=async(userData)=>{
return User.create(userData);

}

export const incrementTokenVersion=async(userId)=>{
return User.findByIdAndUpdate(
    userId,{
      $inc:{
        tokenVersion:1
      }  
    },
    {new:true}
)
} 