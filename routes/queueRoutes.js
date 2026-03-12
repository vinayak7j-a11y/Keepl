const express=require("express")
const router=express.Router()

const {getQueue}=require("../controllers/queueController")

router.get("/queue/:shopId",getQueue)

module.exports=router