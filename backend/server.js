import dotenv from "dotenv";
import {connectdb} from "./config/db.js"
import app from  "./app.js";
dotenv.config();

const PORT = process.env.PORT || 5000;

const startserver=async()=>{
    try{
  await connectdb();
  app.listen(PORT, ()=>{
    console.log(`server is created form this port ${PORT}`)

  })
    }catch(err){
console.log("Failed to start server ", err)
process.exit(1)
    }
}
 startserver();

