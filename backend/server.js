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
const app = express()

// Allow multiple origins in development (localhost, 127.0.0.1, production frontend)
const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith(".onrender.com") || origin.endsWith(".vercel.app")) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}))
app.use(express.json())
DBConnect()

const server = createServer(app)
app.get("/", (req, res) => {
    res.send("Hello World")
})

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    }
})

// Track online users: userId -> Set of socket.ids
const onlineUsers = new Map();

io.on("connection", (socket) => {
    // Immediately send the list of currently online users to the connecting client
    socket.emit("get-online-users", Array.from(onlineUsers.keys()));

    // User registers their personal ID room
    socket.on("user-id", (id) => {
        if (id) {
            const userId = String(id);
            socket.userId = userId;
            socket.join(userId);

            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId).add(socket.id);

            // Broadcast updated online users list to all connected clients
            io.emit("get-online-users", Array.from(onlineUsers.keys()));
        }
    })

    // User joins a 1-to-1 conversation room
    socket.on("roomid", (id) => {
        if (id) {
            socket.join(String(id));
        }
    })

    // Fetch conversation history
    socket.on("getmsg", async (roomid) => {
        try {
            const oldMsg = await SocketData.find({ roomid: String(roomid) }).sort({ createdAt: 1 })
            socket.emit("oldmsg", oldMsg)
        } catch (error) {
            console.error("Error fetching old messages:", error);
            socket.emit("oldmsg", [])
        }
    })

    // Send new message
    socket.on("user-msg", async (data) => {
        try {
            const savedMsg = await SocketData.create({
                roomid: String(data.roomid),
                msg: data.msg || "",
                receiveid: String(data.receiveid),
                senderid: String(data.senderid),
                file: data.file || []
            })

            // Broadcast to all participants in this conversation room
            io.to(String(data.roomid)).emit("messages", savedMsg);

            // Also deliver directly to receiver's personal room if different
            if (data.receiveid && String(data.receiveid) !== String(data.senderid)) {
                io.to(String(data.receiveid)).emit("messages", savedMsg);
            }
        } catch (error) {
            console.error("Error saving socket message:", error);
        }
    })

    // Handle user disconnect (e.g. closed browser, logged out, or lost connection)
    socket.on("disconnect", () => {
        if (socket.userId && onlineUsers.has(socket.userId)) {
            const userSockets = onlineUsers.get(socket.userId);
            userSockets.delete(socket.id);
            if (userSockets.size === 0) {
                onlineUsers.delete(socket.userId);
            }
            // Broadcast updated online users list to all remaining clients
            io.emit("get-online-users", Array.from(onlineUsers.keys()));
        }
    })
})

app.use("/api/v1", router)
app.use("/api/v1", SocketRouter)
app.use("/api/v1/upload", imageRouter)

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})