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
    socket.on("user-id", async (id) => {
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

            // User came online! Mark all "sent" messages addressed to this user as "delivered"
            try {
                const updateRes = await SocketData.updateMany(
                    { receiveid: userId, status: "sent" },
                    { $set: { status: "delivered" } }
                );

                if (updateRes.modifiedCount > 0) {
                    // Notify senders that their messages are now delivered (double grey tick)
                    io.emit("messages-delivered", { receiveid: userId });
                }

                // Send current unread counts & latest messages summary for sidebar
                // Only count messages that are NOT yet seen and not deleted for this user
                const unreadSummary = await SocketData.aggregate([
                    { $match: { receiveid: userId, status: { $ne: "seen" }, seenmsg: { $ne: true }, deletedFor: { $ne: userId } } },
                    { $group: { _id: "$senderid", count: { $sum: 1 } } }
                ]);

                const unreadMap = {};
                unreadSummary.forEach(item => {
                    unreadMap[item._id] = item.count;
                });

                socket.emit("unread-summary", unreadMap);
            } catch (err) {
                console.error("Error updating message delivery status:", err);
            }
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
            const query = { roomid: String(roomid) };
            if (socket.userId) {
                query.deletedFor = { $ne: String(socket.userId) };
            }
            const oldMsg = await SocketData.find(query).sort({ createdAt: 1 })
            socket.emit("oldmsg", oldMsg)
        } catch (error) {
            console.error("Error fetching old messages:", error);
            socket.emit("oldmsg", [])
        }
    })

    // Send new message
    socket.on("user-msg", async (data) => {
        try {
            const recipientId = String(data.receiveid);
            const isRecipientOnline = onlineUsers.has(recipientId);
            const initialStatus = isRecipientOnline ? "delivered" : "sent";

            const savedMsg = await SocketData.create({
                roomid: String(data.roomid),
                msg: data.msg || "",
                receiveid: recipientId,
                senderid: String(data.senderid),
                file: data.file || [],
                status: initialStatus,
                seenmsg: false
            })

            // Broadcast to all participants in this conversation room
            io.to(String(data.roomid)).emit("messages", savedMsg);

            // Also deliver directly to receiver's personal room if different
            if (recipientId && recipientId !== String(data.senderid)) {
                io.to(recipientId).emit("messages", savedMsg);
                // Send notification event to receiver (for popup toast)
                io.to(recipientId).emit("notification-msg", savedMsg);
            }
        } catch (error) {
            console.error("Error saving socket message:", error);
        }
    })

    // Mark messages in a room as seen (Double Blue Tick)
    socket.on("mark-seen", async ({ roomid, readerId }) => {
        try {
            if (!roomid || !readerId) return;

            await SocketData.updateMany(
                {
                    roomid: String(roomid),
                    receiveid: String(readerId),
                    status: { $ne: "seen" }
                },
                {
                    $set: { status: "seen", seenmsg: true }
                }
            );

            // Notify everyone in the room that messages have been seen by readerId
            io.to(String(roomid)).emit("messages-seen", {
                roomid: String(roomid),
                readerId: String(readerId)
            });
        } catch (error) {
            console.error("Error marking messages as seen:", error);
        }
    })

    // Delete message for me only (hide from this user, keep in DB)
    socket.on("delete-for-me", async ({ msgId, userId }) => {
        try {
            if (!msgId || !userId) return;
            await SocketData.findByIdAndUpdate(msgId, {
                $addToSet: { deletedFor: String(userId) }
            });
            // Only notify the requesting user's sockets
            io.to(String(userId)).emit("message-deleted-for-me", { msgId, userId: String(userId) });
        } catch (error) {
            console.error("Error deleting message for me:", error);
        }
    })

    // Delete message for everyone (remove from DB entirely)
    socket.on("delete-for-everyone", async ({ msgId, roomid, userId }) => {
        try {
            if (!msgId || !roomid || !userId) return;
            // Only the sender can delete for everyone
            const msg = await SocketData.findById(msgId);
            if (!msg || String(msg.senderid) !== String(userId)) return;
            await SocketData.findByIdAndDelete(msgId);
            // Broadcast deletion to all users in this room + both personal rooms
            io.to(String(roomid)).emit("message-deleted-everyone", { msgId, roomid: String(roomid) });
            io.to(String(msg.receiveid)).emit("message-deleted-everyone", { msgId, roomid: String(roomid) });
            io.to(String(msg.senderid)).emit("message-deleted-everyone", { msgId, roomid: String(roomid) });
        } catch (error) {
            console.error("Error deleting message for everyone:", error);
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