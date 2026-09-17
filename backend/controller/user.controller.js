import user from "../model/user.model.js"  
import jwt from "jsonwebtoken"

export const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body
        const U = await user.create({
            username,
            email,
            password
        })

        const token = jwt.sign({ id: U._id }, process.env.KEY_1, { expiresIn: "1h" })

        return res.status(201).json({
            message: "User Created",
            U,
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
        const { email } = req.body

        const U = await user.findOne({ email })

        if (!U) {
            return res.status(401).json({
                message: "User not found"
            })
        }

        const token = jwt.sign({ id: U._id }, process.env.KEY_1, { expiresIn: "1h" })

        return res.status(200).json({
            message: "User Logged in successfully",
            U,
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
