export const validateCreateProduct =(data)=>{
    const { sku, name,category,unitPrice,reorderLevel}=data;
    if(!sku){
        return "Sku is required"
    }
    if(!name){
        return "Name is required"
    }
      if(category==undefined || category==null){
        return "Category is required"
    }
    if(category <0){
        return "Category can not be negative"

    }
    if(unitPrice==undefined || unitPrice==null){
        return "UnitPrice is required"
    }
    if(reorderLevel==undefined || reorderLevel==null){
                return "ReorderLevel is required"
        }
    if(reorderLevel <0){
        return "ReorderLevel can not be negative"
    }
 return null;
}