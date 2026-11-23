import mongoose from "mongoose"

const ImageSchema = mongoose.Schema({
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: "image"
    },
    sendAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true })

const Image = mongoose.model("Image", ImageSchema)

export default Image
