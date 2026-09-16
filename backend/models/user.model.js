import mongoose from "mongoose"


const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"name is required"],
        minlength:2,
        maxLength:20,
        trim:true
    },
    email:{
        type:String,
        required:[true,"email is required"],
        trim:true,
        unique: true,
       lowercase: true,
       index:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        trim:true,
        select:false
    },
    role:{
        type:String,
        enum:[
        "Admin",
        "Procurement Manager",
        "Warehouse Manager",
        "Warehouse Staff",
        "Inventory Auditor"
        ],
        trim:true,
        default:"Warehouse Staff"
    },
    status:{
        type:String,
        enum:[
            "Active",
            "Inactive",
            "Suspended"
        ],
    trim:true,
    default:"Active"
    },
    warehouseIds:[{
    type:mongoose.Schema.Types.ObjectId,
     ref:"Warehouse"
    }],
    tokenVersion:{
        type:Number,
        default:0
    }
    },
    {
    timestamps:true
    }
    )

const User=mongoose.model("user",userSchema)

export default User