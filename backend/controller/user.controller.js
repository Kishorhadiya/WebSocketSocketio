import user from "../model/user.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import mongoose from "mongoose"

const JWT_SECRET = process.env.KEY_1 || process.env.JWT_SECRET || "chatapp_jwt_secret_fallback_key_2026";

export const signup = async (req, res) => {
    try {
        // Check database connection status
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                message: "Database not connected",
                error: "Database connection is not ready. Please verify MONGO_URL and ensure 0.0.0.0/0 is added to IP Whitelist in MongoDB Atlas."
            })
        }

        const { username, email, password } = req.body

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required"
            })
        }

        // Check for duplicate email
        const existingUser = await user.findOne({ email: email.toLowerCase().trim() })
        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered. Please log in instead."
            })
        }

        // Hash password before saving
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const U = await user.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword
        })

        const token = jwt.sign({ id: U._id }, JWT_SECRET, { expiresIn: "7d" })

        // Return user without the hashed password
        const userResponse = { _id: U._id, username: U.username, email: U.email }

        return res.status(201).json({
            message: "User Created",
            U: userResponse,
            token
        })
    }
    catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            message: "User not created",
            error: error.message
        })
    }
}

export const signin = async (req, res) => {
    try {
        // Check database connection status
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                message: "Database not connected",
                error: "Database connection is not ready. Please verify MONGO_URL and ensure 0.0.0.0/0 is added to IP Whitelist in MongoDB Atlas."
            })
        }

        const { email, password } = req.body

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            })
        }

        const U = await user.findOne({ email: email.toLowerCase().trim() })

        if (!U) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        // Compare provided password with stored password
        let isPasswordValid = false
        try {
            isPasswordValid = await bcrypt.compare(password, U.password)
        } catch {
            isPasswordValid = false
        }

        // Backward compatibility: If user was created before bcrypt was added
        if (!isPasswordValid && U.password === password) {
            isPasswordValid = true
            // Upgrade password to bcrypt hash in DB
            U.password = await bcrypt.hash(password, 10)
            await U.save()
        }

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        const token = jwt.sign({ id: U._id }, JWT_SECRET, { expiresIn: "7d" })

        // Return user without the hashed password
        const userResponse = { _id: U._id, username: U.username, email: U.email }

        return res.status(200).json({
            message: "User Logged in successfully",
            U: userResponse,
            token
        })
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "User not logged in",
            error: error.message
        })
    }
}
