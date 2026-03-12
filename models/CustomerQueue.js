const mongoose = require("mongoose");

const queueSchema = new mongoose.Schema({

name:String,

phone:String,

shopId:{
type:mongoose.Schema.Types.ObjectId,
ref:"Shop"
},

status:{
type:String,
default:"waiting"
},

createdAt:{
type:Date,
default:Date.now
}

})

module.exports=mongoose.model("CustomerQueue",queueSchema)