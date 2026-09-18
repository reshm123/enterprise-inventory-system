import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export const connectdb=async()=>{
try{
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
	throw new Error("MONGODB_URI is not set. Add it to backend/.env.");
}

const connect=await mongoose.connect(mongoUri)
console.log(`mongodb is connected ${connect.connection.host}`)
}
catch(err){
console.log(err)

throw err;
}
}