const CustomerQueue=require("../models/CustomerQueue")
const Shop=require("../models/Shop")

exports.getQueue=async(req,res)=>{

try{

const {shopId}=req.params

const shop=await Shop.findOne({shopId})

const queue=await CustomerQueue.find({

shopId:shop._id,
status:"waiting"

}).sort({createdAt:1})

res.json(queue)

}catch(error){

res.status(500).json({error:error.message})

}

}