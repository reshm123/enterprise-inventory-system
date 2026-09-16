import bcrypt from "bcrypt"

 export const hashedpassword=async(password)=>{
   let SALT_ROUNDS=12
 return   bcrypt.hash(password,12);
}
export const passwordcompare=async(password,hasedpassword)=>{
  return   bcrypt.compare(password,hasedpassword)
}
