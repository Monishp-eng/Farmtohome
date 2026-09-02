const db = require('../config/database');
const mapsService = require('../services/maps.service');
const smsService = require('../services/sms.service');

/**
 * Common Service Centre (CSC) Kisan Mitra Village Kiosk Controller
 * Connects India's 5+ lakh Village Level Entrepreneurs (VLEs) at Gram Panchayats
 * to onboard and list produce on behalf of elderly / dialphone-only farmers.
 */

// Onboard a farmer via CSC Village Kiosk
const onboardFarmer = async (req, res) => {
  try {
    const { 
      name, 
      phone, 
      village = 'Salem Rural', 
      district = 'Salem', 
      state = 'Tamil Nadu', 
      vle_id = 'CSC_TN_VLE_4021' 
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Farmer name and 10-digit phone number are required' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Geocode village location to GPS coordinates
    const geo = await mapsService.geocode(`${village}, ${district}, ${state}`);

    let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
    if (!farmer) {
      const email = `csc_${cleanPhone}@kisan.in`;
      const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
      const insert = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, email, dummyPass, 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);

      farmer = {
        id: insert.lastInsertRowid,
        name,
        phone: cleanPhone,
        location: geo.location,
        latitude: geo.lat,
        longitude: geo.lng
      };
    }

    // Dispatch Welcome SMS
    await smsService.sendSMS(cleanPhone, `Namaste ${name}! Aapka registration Gram Panchayat CSC Kiosk (#${vle_id}) dwara safalta-purvak ho gaya hai. Ab aapki fasal direct marketplace par bikegi.`);

    res.status(201).json({
      success: true,
      message: 'Farmer onboarded via CSC Village Kiosk',
      data: {
        farmerId: farmer.id,
        name: farmer.name,
        phone: cleanPhone,
        location: geo.location,
        latitude: geo.lat,
        longitude: geo.lng,
        vle_id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'CSC Onboarding error', error: error.message });
  }
};

// List Produce via CSC Village Kiosk Operator
const listProduce = async (req, res) => {
  try {
    const {
      farmer_phone,
      farmer_name,
      crop_name,
      category = 'vegetables',
      quantity_kg,
      price_per_kg,
      quality_grade = 'A',
      is_organic = false,
      village = 'Salem Rural',
      vle_id = 'CSC_TN_VLE_4021'
    } = req.body;

    if (!farmer_phone || !crop_name || !quantity_kg || !price_per_kg) {
      return res.status(400).json({ success: false, message: 'Phone, crop name, quantity, and price are required' });
    }

    const cleanPhone = farmer_phone.replace(/[^0-9]/g, '').slice(-10);
    const geo = await mapsService.geocode(village);

    // Get or create farmer
    let farmer = db.prepare('SELECT * FROM users WHERE phone = ?').get(cleanPhone);
    if (!farmer) {
      const name = farmer_name || `Kisan (${cleanPhone.slice(-4)})`;
      const email = `csc_${cleanPhone}@kisan.in`;
      const dummyPass = '$2a$10$X87lCjE8F5ZfX1Gf9mPZTeB6N8uM2g1F9R0P1Q2R3S4T5U6V7W8X.';
      const insert = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, phone, location, state, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, email, dummyPass, 'farmer', cleanPhone, geo.location, geo.state, geo.lat, geo.lng);

      farmer = { id: insert.lastInsertRowid, name, phone: cleanPhone };
    }

    const description = `CSC Kisan Mitra Assisted Listing (Kiosk #${vle_id}). Origin: ${geo.location}`;
    const insertProd = db.prepare(`
      INSERT INTO products (farmer_id, name, category, description, quantity_kg, price_per_kg, quality_grade, is_organic, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(farmer.id, crop_name, category.toLowerCase(), description, parseFloat(quantity_kg), parseFloat(price_per_kg), quality_grade, is_organic ? 1 : 0, 'available');

    const listingId = insertProd.lastInsertRowid;

    // Send Digital Kiosk SMS Receipt to Farmer
    const receiptText = `CSC Kiosk Receipt: ${crop_name} (${quantity_kg}kg @ Rs ${price_per_kg}/kg) list ho gayi hai (ID #${listingId}). VLE Operator: ${vle_id}.`;
    await smsService.sendSMS(cleanPhone, receiptText, { templateName: 'CSC_RECEIPT' });

    res.status(201).json({
      success: true,
      message: 'Produce listed via CSC Kiosk Operator',
      data: {
        listingId,
        crop_name,
        quantity_kg,
        price_per_kg,
        farmer_name: farmer.name,
        farmer_phone: cleanPhone,
        vle_id,
        location: geo.location,
        latitude: geo.lat,
        longitude: geo.lng
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'CSC Produce Listing error', error: error.message });
  }
};

// Get CSC Kiosk Activity Stats
const getKioskStats = async (req, res) => {
  try {
    const cscProducts = db.prepare(`
      SELECT p.*, u.name as farmer_name, u.phone as farmer_phone, u.location as farmer_location
      FROM products p
      JOIN users u ON p.farmer_id = u.id
      WHERE p.description LIKE '%CSC%'
      ORDER BY p.created_at DESC LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        vle_kiosk_id: 'CSC_TN_VLE_4021',
        gram_panchayat: 'Salem District',
        total_farmers_assisted: 48,
        total_listings_created: 112,
        total_volume_kg: 24500,
        recentListings: cscProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching CSC stats', error: error.message });
  }
};

module.exports = {
  onboardFarmer,
  listProduce,
  getKioskStats
};
