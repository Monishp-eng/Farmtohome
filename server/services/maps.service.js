/**
 * Google Maps & Indian Agricultural Geocoding Service
 * Converts rural village / district / mandi names to GPS latitude & longitude coordinates.
 * Includes Google Geocoding API integration + Instant Zero-Cost Indian Agronomy Fallback Dictionary.
 */

const fetch = require('node-fetch');

// Curated Agricultural Hubs & Mandis across Indian states
const INDIAN_AGRI_DISTRICTS = {
  // Tamil Nadu
  'salem': { lat: 11.6643, lng: 78.1460, state: 'Tamil Nadu', district: 'Salem' },
  'erode': { lat: 11.3410, lng: 77.7172, state: 'Tamil Nadu', district: 'Erode' },
  'madurai': { lat: 9.9252, lng: 78.1198, state: 'Tamil Nadu', district: 'Madurai' },
  'coimbatore': { lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu', district: 'Coimbatore' },
  'thanjavur': { lat: 10.7870, lng: 79.1378, state: 'Tamil Nadu', district: 'Thanjavur' },
  'dindigul': { lat: 10.3673, lng: 77.9803, state: 'Tamil Nadu', district: 'Dindigul' },
  'tiruchirappalli': { lat: 10.7905, lng: 78.7047, state: 'Tamil Nadu', district: 'Tiruchirappalli' },
  'chennai': { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', district: 'Chennai' },

  // Maharashtra
  'nashik': { lat: 19.9975, lng: 73.7898, state: 'Maharashtra', district: 'Nashik' },
  'lasalgaon': { lat: 20.1477, lng: 74.2274, state: 'Maharashtra', district: 'Nashik' },
  'pune': { lat: 18.5204, lng: 73.8567, state: 'Maharashtra', district: 'Pune' },
  'nagpur': { lat: 21.1458, lng: 79.0882, state: 'Maharashtra', district: 'Nagpur' },
  'kolhapur': { lat: 16.7050, lng: 74.2433, state: 'Maharashtra', district: 'Kolhapur' },
  'solapur': { lat: 17.6599, lng: 75.9064, state: 'Maharashtra', district: 'Solapur' },
  'mumbai': { lat: 19.0760, lng: 72.8777, state: 'Maharashtra', district: 'Mumbai' },

  // Punjab & Haryana
  'ludhiana': { lat: 30.9010, lng: 75.8573, state: 'Punjab', district: 'Ludhiana' },
  'amritsar': { lat: 31.6340, lng: 74.8723, state: 'Punjab', district: 'Amritsar' },
  'khanna': { lat: 30.7029, lng: 76.2163, state: 'Punjab', district: 'Ludhiana' },
  'karnal': { lat: 29.6857, lng: 76.9905, state: 'Haryana', district: 'Karnal' },

  // Karnataka & Andhra / Telangana
  'bangalore': { lat: 12.9716, lng: 77.5946, state: 'Karnataka', district: 'Bengaluru' },
  'kolar': { lat: 13.1378, lng: 78.1294, state: 'Karnataka', district: 'Kolar' },
  'anantapur': { lat: 14.6819, lng: 77.6006, state: 'Andhra Pradesh', district: 'Anantapur' },
  'guntur': { lat: 16.3067, lng: 80.4365, state: 'Andhra Pradesh', district: 'Guntur' },
  'kurnool': { lat: 15.8281, lng: 78.0373, state: 'Andhra Pradesh', district: 'Kurnool' },
  'hyderabad': { lat: 17.3850, lng: 78.4867, state: 'Telangana', district: 'Hyderabad' },

  // Gujarat & Kerala
  'anand': { lat: 22.5645, lng: 72.9289, state: 'Gujarat', district: 'Anand' },
  'surat': { lat: 21.1702, lng: 72.8311, state: 'Gujarat', district: 'Surat' },
  'wayanad': { lat: 11.6854, lng: 76.1320, state: 'Kerala', district: 'Wayanad' },
  'kochi': { lat: 9.9312, lng: 76.2673, state: 'Kerala', district: 'Ernakulam' },

  // North & Central India
  'delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi', district: 'New Delhi' },
  'azadpur': { lat: 28.7067, lng: 77.1772, state: 'Delhi', district: 'North Delhi' },
  'indore': { lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh', district: 'Indore' },
  'varanasi': { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh', district: 'Varanasi' },
  'shimla': { lat: 31.1048, lng: 77.1734, state: 'Himachal Pradesh', district: 'Shimla' }
};

class MapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Geocode a village, district, or town name to { lat, lng, formattedAddress, state, district }
   */
  async geocode(locationName, fallbackState = 'Tamil Nadu') {
    if (!locationName || !locationName.trim()) {
      return { lat: 11.6643, lng: 78.1460, location: 'Salem', state: 'Tamil Nadu', district: 'Salem' };
    }

    const clean = locationName.trim().toLowerCase();

    // 1. Check local fast-lookup dictionary
    for (const [key, val] of Object.entries(INDIAN_AGRI_DISTRICTS)) {
      if (clean.includes(key) || key.includes(clean)) {
        return {
          lat: val.lat,
          lng: val.lng,
          location: `${val.district}, ${val.state}`,
          district: val.district,
          state: val.state,
          source: 'INDIAN_AGRI_DICTIONARY'
        };
      }
    }

    // 2. Call Google Geocoding API if key is present
    if (this.apiKey && this.apiKey !== 'your_google_maps_api_key') {
      try {
        const query = encodeURIComponent(`${locationName}, India`);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${this.apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return {
            lat: loc.lat,
            lng: loc.lng,
            location: data.results[0].formatted_address,
            state: fallbackState,
            source: 'GOOGLE_GEOCODING_API'
          };
        }
      } catch (err) {
        console.warn('[Google Geocoding Warning]:', err.message);
      }
    }

    // Default center point for Indian agricultural zone (Salem / Central India)
    return {
      lat: 11.6643,
      lng: 78.1460,
      location: `${locationName}, ${fallbackState}`,
      state: fallbackState,
      district: locationName,
      source: 'DEFAULT_COORDINATES'
    };
  }

  /**
   * Calculate Haversine direct distance in kilometers between two GPS points
   */
  calculateDistanceKm(lat1, lng1, lat2, lng2) {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return parseFloat(d.toFixed(1));
  }
}

module.exports = new MapsService();
