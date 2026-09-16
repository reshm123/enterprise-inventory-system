import mongoose from "mongoose"

export const connectdb=async()=>{
try{
const connect=await mongoose.connect(process.env.MONGODB_URI)
console.log(`mongodb is connected ${connect.connection.host}`)
}
catch(err){
console.log(err)

throw err;
}
}