import user from "../model/user.model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body

        // Validate required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required"
            })
        }

        // Check for duplicate email
        const existingUser = await user.findOne({ email })
        if (existingUser) {
            return res.status(409).json({
                message: "Email already registered. Please log in instead."
            })
        }

        // Hash password before saving
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        const U = await user.create({
            username,
            email,
            password: hashedPassword
        })

        const token = jwt.sign({ id: U._id }, process.env.KEY_1, { expiresIn: "1h" })

        // Return user without the hashed password
        const userResponse = { _id: U._id, username: U.username, email: U.email }

        return res.status(201).json({
            message: "User Created",
            U: userResponse,
            token
        })
    }
    catch (error) {
        return res.status(500).json({
            message: "User not created",
            error: error.message
        })
    }
}

export const signin = async (req, res) => {
    try {
        const { email, password } = req.body

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            })
        }

        const U = await user.findOne({ email })

        if (!U) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        // Compare provided password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, U.password)

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password"
            })
        }

        const token = jwt.sign({ id: U._id }, process.env.KEY_1, { expiresIn: "1h" })

        // Return user without the hashed password
        const userResponse = { _id: U._id, username: U.username, email: U.email }

        return res.status(200).json({
            message: "User Logged in successfully",
            U: userResponse,
            token
        })
    }
    catch (error) {
        return res.status(500).json({
            message: "User not logged in",
            error: error.message
        })
    }
}
