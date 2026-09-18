import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Supplier name is required"],
        trim:true,
        minlength:[2,"Supplier name must be atleast 2 character"],
        maxlength:[100, "Spplier name can not be exeed 100 character"]
    },
    email:{
        type:String,
        required:[true, "Supplier email is required"],
        trim:true,
        lowercase:true,
        match:[ /^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email id"]
    },
    phone:{
        type:String,
        required:[true,"Supplier phone is required"],
        trim:true,
        match:[ /^[0-9+\-\s()]{7,20}$/, "Please provide a valid phone number"]

    },
    address:{
        type:String,
        required:[true,"Supplier address is required"],
        trim:true,
        maxlength:[500 ,"Address can not exceed 500 character"]
    },
    gstVatNumber:{
        type:String,
        uppercase:true,
        trim:true,
        maxlength:[30 ,"Gst vat number can not exceed 30 character"]
    },
    contactPerson:{
         type:String,
          required:[true,"Contact person  is required"],
        trim:true,
        maxlength:[100 ,"Contact person can not exceed 100 character"]
    },
    status:{
        type:String,
        enum:["Active","Inactive"],
        default:"Active"
    }
}, {
        timestamps:true
    });

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;


