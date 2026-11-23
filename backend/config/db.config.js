import mongoose from "mongoose";

const DBConnect = async () => {
    try {
        const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
        if (!uri) {
            console.error("FATAL: Neither MONGO_URL nor MONGODB_URI is defined in environment variables!");
            return;
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of waiting 30s
        });
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Error connecting to database:", error.message);
    }
};

export default DBConnect;