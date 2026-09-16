export const validateRegister=(data)=>{
    const {name,email,password}=data;
    if(!name){
        return "Name is required"
    }
     if(!email){
        return "Email is required"
    }
     if(!password){
        return "Password is required"
    }

   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if(!emailRegex.test(email)){
        return "Invalid email format";
    }
     if(password.length <8){
    return "Password must be atleast 8 character"
     }

     return null;

}

export const validateLogin=(data)=>{
const {email, password}=data

 if(!email){
        return "Email is required"
    }
     if(!password){
        return "Password is required"
    }
    return null
}


















