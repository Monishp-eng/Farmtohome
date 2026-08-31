const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['farmer', 'consumer', 'buyer', 'fpo', 'logistics', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const productValidation = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('category').isIn(['vegetables', 'fruits', 'grains', 'pulses', 'dairy', 'spices', 'oilseeds']).withMessage('Invalid category'),
  body('quantity_kg').isNumeric().withMessage('Quantity must be a number'),
  body('price_per_kg').isNumeric().withMessage('Price must be a number')
];

const orderValidation = [
  body('product_id').isInt().withMessage('Product ID must be an integer'),
  body('quantity_kg').isNumeric().withMessage('Quantity must be a number')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  productValidation,
  orderValidation
};
