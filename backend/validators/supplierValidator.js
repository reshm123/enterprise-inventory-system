import  Joi from "joi";


const createSupplierSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  email: Joi.string().email().required(),

  phone: Joi.string().trim().min(7).max(20).required(),

  address: Joi.string().trim().max(500).required(),

  gstVatNumber: Joi.string().trim().max(30).allow("", null),

  contactPerson: Joi.string().trim().max(100).required(),

  status: Joi.string().valid("Active", "Inactive").default("Active"),
});

const updateSupplierSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),

  email: Joi.string().email(),

  phone: Joi.string().trim().min(7).max(20),

  address: Joi.string().trim().max(500),

  gstVatNumber: Joi.string().trim().max(30).allow("", null),

  contactPerson: Joi.string().trim().max(100),

  status: Joi.string().valid("Active", "Inactive"),
}).min(1);

export {
  createSupplierSchema,
  updateSupplierSchema,
};