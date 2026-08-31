const db = require('../config/database');

const getCart = async (req, res) => {
  try {
    const cartItems = db.prepare(`
      SELECT c.id, c.product_id, p.name as product_name, p.category, p.price_per_kg, c.quantity_kg, u.name as farmer_name, u.location as farmer_location
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      JOIN users u ON p.farmer_id = u.id
      WHERE c.user_id = ?
    `).all(req.user.id);
    
    res.json({ success: true, data: cartItems });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const { product_id, quantity_kg } = req.body;
    const user_id = req.user.id;

    const existing = db.prepare('SELECT id, quantity_kg FROM cart_items WHERE user_id = ? AND product_id = ?').get(user_id, product_id);
    
    if (existing) {
      db.prepare('UPDATE cart_items SET quantity_kg = quantity_kg + ? WHERE id = ?').run(quantity_kg, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (user_id, product_id, quantity_kg) VALUES (?, ?, ?)').run(user_id, product_id, quantity_kg);
    }
    
    res.status(201).json({ success: true, message: 'Item added to cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { quantity_kg } = req.body;
    const item_id = req.params.id;
    
    const item = db.prepare('SELECT user_id FROM cart_items WHERE id = ?').get(item_id);
    if (!item || item.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    db.prepare('UPDATE cart_items SET quantity_kg = ? WHERE id = ?').run(quantity_kg, item_id);
    res.json({ success: true, message: 'Cart updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const item_id = req.params.id;
    
    const item = db.prepare('SELECT user_id FROM cart_items WHERE id = ?').get(item_id);
    if (!item || item.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    db.prepare('DELETE FROM cart_items WHERE id = ?').run(item_id);
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const clearCart = async (req, res) => {
  try {
    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
