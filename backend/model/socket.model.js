import mongoose from "mongoose";


const SocketUserSchema = mongoose.Schema({
  roomid: {
    type: String,
    required: true,
    index: true,
  },
  msg: {
    type: String,
    default: "",
  },
  receiveid: {
    type: String,
    required: true,
  },
  senderid: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  file: [
    {
      title: {
        type: String,
        default: "image",
      },
      image: {
        type: String,
        required: true,
      },
      sendAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  seenmsg: {
    type: Boolean,
    default: false,
  },
});

const SocketData=mongoose.model("SocketData",SocketUserSchema)
export default SocketData

