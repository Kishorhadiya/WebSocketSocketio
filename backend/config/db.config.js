import mongoose from "mongoose";

const DBConnect=async()=>{
      try{
         await mongoose.connect(process.env.MONGO_URL || process.env.MONGODB_URI)
         console.log("Database connected successfully")
      }
      catch(error){
         console.log("Error connecting to database",error)
      }
} 


export default DBConnect;