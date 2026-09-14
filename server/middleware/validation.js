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

const otpSendValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$|^(\+91)[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number is required')
];

const otpVerifyValidation = [
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('otp').trim().isLength({ min: 4, max: 6 }).withMessage('OTP must be 4 to 6 digits')
];

const bankDetailsValidation = [
  body('bank_account_number').trim().notEmpty().withMessage('Bank account number is required')
    .isNumeric().withMessage('Bank account must contain digits only'),
  body('bank_ifsc').trim().toUpperCase().matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Valid Indian IFSC code required (e.g. SBIN0001234)')
];

const paymentCreateValidation = [
  body('order_id').notEmpty().withMessage('Valid order_id is required')
];

const paymentVerifyValidation = [
  body('order_id').notEmpty().withMessage('order_id is required'),
  body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
  body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
  body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required')
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  productValidation,
  orderValidation,
  otpSendValidation,
  otpVerifyValidation,
  bankDetailsValidation,
  paymentCreateValidation,
  paymentVerifyValidation
};
