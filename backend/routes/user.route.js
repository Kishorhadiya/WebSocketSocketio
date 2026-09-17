import {Router} from "express" 
import {signup,signin} from "../controller/user.controller.js"

const router=Router()

router.post("/create",signup)
router.post("/login",signin)



export default router