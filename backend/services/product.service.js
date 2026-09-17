import {createProduct , findProductBySku ,findProductById , findAllProducts , productUpdate, deleteProduct} from "../repositories/product.repository.js"
import {validateCreateProduct} from "../validators/product.validator.js"

export const createProductService=async(data)=>{
const validateError=validateCreateProduct(data);
if(validateError){
    throw new Error(validateError)
}
const existingproduct=await findProductBySku(data.sku);
if(existingproduct){
    throw new Error("Product with sku already exists")
    
}
const productData={...data,sku:data.sku.toUpperCase()}
return createProduct(productData);
}
export const getProductService = async (productId) => {
  const product = await findProductById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  return product;
};

export const getProductsService=async(query)=>{
    const {search, category,status,page,limit}= query
    const pageNumber=Number(page);
    const limitNumber=Number(limit)

  return  findAllProducts({search, category,status,pageNumber,limitNumber});
    
}

export const updateProductService=async( productId, data)=>{
const product=await findProductById(productId);
 if (!product) {
    throw new Error("Product not found");
  }
  if (data.sku) {
    data.sku = data.sku.toUpperCase();

    const existingProduct = await findProductBySku(data.sku);

    if (
      existingProduct &&
      existingProduct._id.toString() !== productId
    ) {
      throw new Error("Product with this SKU already exists");
    }
  }

  return productUpdate(productId, data);
}

export const deleteProductService = async (productId) => {
  const product = await findProductById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  return deleteProduct(productId);
};