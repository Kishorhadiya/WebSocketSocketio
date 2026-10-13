import express from "express"
import dotenv from "dotenv"
import { Server } from "socket.io"
import {createServer} from "node:http"
import cors from "cors" 
import router from "./routes/user.route.js"
import DBConnect from "./config/db.config.js"
import SocketRouter from "./routes/socket.route.js"
import SocketData from "./model/socket.model.js"
import imageRouter from "./routes/image.route.js"
dotenv.config()
const app=express()
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: allowedOrigin,
    credentials: true,
}))
app.use(express.json())
 DBConnect()
const server=createServer(app)
app.get("/",(req,res)=>{
    res.send("Hello World")
})
const io=new Server(server,{
    cors:{
        origin: allowedOrigin,
        credentials: true,
    }
})
    

 io.on("connection",(socket)=>{
    socket.on("user-ID",(id)=>{
        socket.join(id);
    })

    socket.on("roomid",(id)=>{
        socket.join(id)
    })

    socket.on("getmsg", async(roomid)=>{
        const oldMsg = await SocketData.find({ roomid: roomid })
        socket.emit("oldmsg", oldMsg)
    })

    socket.on("user-msg",(data)=>{
         SocketData.create({
            roomid:data.roomid,
            msg:data.msg,
            receiveid:data.receiveid,
            senderid:data.senderid,
            file:data.file || []
         })
        io.to(data.roomid).emit("messages",data);
    })
 })


 app.use("/api/v1",router)
 app.use("/api/v1",SocketRouter)
 app.use("/api/v1/upload",imageRouter)

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})