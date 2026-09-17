import {
  createProductService,
  getProductService,
  getProductsService,
  updateProductService,
  deleteProductService
} from "../services/product.service.js";

import {
  successResponse,
  errorResponse
} from "../utils/response.js";

export const createProduct=async(req,res,next)=>{
    try{
const product=await createProductService(req.body);
return successResponse(res,201,"Product created successfully",product);
    }
catch(error){
    next(error)
}
}

export const getProduct=async(req,res,next)=>{
    try{
const product=await getProductService(req.params.id);
return successResponse(res,200,"Product fetched successfully",product);
    }catch(err){
        next(err)
    }

}

export const getProducts=async(req,res,next)=>{
     try{
const product=await getProductsService(req.query);
return successResponse(res,200,"Product fetched successfully",product);
    }catch(err){
        next(err)
    }
}

export const updateProduct=async(req,res,next)=>{
  try{
const product=await updateProductService(req.params.id,req.body);
return successResponse(res,200,"Product Updated successfully",product);
    }catch(err){
        next(err)
    }
}

export const deleteProduct=async(req,res,next)=>{
 try{
await deleteProductService(req.params.id);
return successResponse(res,200,"Product deleted successfully");
    }catch(err){
        next(err)
    }
}