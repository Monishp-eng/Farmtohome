const express = require('express');
const router = express.Router();
const { getAllProducts, getSmartMatchProducts, getProductById, createProduct, updateProduct, deleteProduct, getMyProducts, getCategorySummary } = require('../controllers/product.controller');
const { productValidation, validate } = require('../middleware/validation');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', getAllProducts);
router.get('/smart-match', getSmartMatchProducts);
router.get('/categories/summary', getCategorySummary);
router.get('/farmer/my-products', authenticateToken, authorizeRoles('farmer', 'fpo'), getMyProducts);
router.get('/:id', getProductById);

router.post('/', authenticateToken, authorizeRoles('farmer', 'fpo'), productValidation, validate, createProduct);
router.put('/:id', authenticateToken, authorizeRoles('farmer', 'fpo', 'admin'), updateProduct);
router.delete('/:id', authenticateToken, authorizeRoles('farmer', 'fpo', 'admin'), deleteProduct);

module.exports = router;
