import {Router} from "express"
import { AllUSer } from "../controller/socket.controller.js"

const SocketRouter=Router()

SocketRouter.get("/all-user",AllUSer)

export default SocketRouter