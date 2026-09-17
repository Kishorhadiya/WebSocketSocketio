import {upload} from "../middleware/multer.middleware.js"
import express from "express"
import { addproduct } from "../controller/image.controller.js"

const imageRouter=express.Router();

imageRouter.post("/upload",upload.array("files",10),addproduct)

export default imageRouter