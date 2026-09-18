import Joi from "joi";

const createWarehouseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required(),

  code: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(20)
    .required(),

  location: Joi.string()
    .trim()
    .max(250)
    .required(),

  managerId: Joi.string()
    .hex()
    .length(24)
    .optional()
    .allow(null),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
    .optional()
});

const updateWarehouseSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100),

  code: Joi.string()
    .trim()
    .uppercase()
    .min(2)
    .max(20),

  location: Joi.string()
    .trim()
    .max(250),

  managerId: Joi.string()
    .hex()
    .length(24)
    .allow(null),

  status: Joi.string()
    .valid("ACTIVE", "INACTIVE")
}).min(1);

export {
  createWarehouseSchema,
  updateWarehouseSchema
};