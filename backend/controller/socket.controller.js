import user from "../model/user.model.js";


export const AllUSer=async(req,res)=>{
    try{
        const users=await user.find();
        return res.status(200).json({
            message:"all user are here",
            users:users
        })
    }

    catch(error)
    {
           return res.status(500).json({
             message: error.message
           })
    }
}