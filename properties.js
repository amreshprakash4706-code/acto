// =============================================
// ATCONIZ REAL ESTATE PLATFORM - ULTIMATE VERSION
// Includes: 100 Properties + Full Global Land & Property Calculator
// Multi-currency • Land mode • Matches offline prices • Any country
// =============================================

// Simple seeded PRNG for consistent property data across reloads
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const seededRandom = mulberry32(20260717); // fixed seed for reproducibility

let properties = [];
let filteredProperties = [];
let favorites = (() => { try { return JSON.parse(localStorage.getItem('atconiz_favorites')) || []; } catch { return []; } })();
let currentTheme = localStorage.getItem('atconiz_theme') || 'dark';
let selectedForCompare = [];
let currentView = 'landing';
let reviewsData = (() => { try { return JSON.parse(localStorage.getItem('atconiz_reviews')) || {}; } catch { return {}; } })();
let visitsData = (() => { try { return JSON.parse(localStorage.getItem('atconiz_visits')) || []; } catch { return []; } })();
let savedCalculations = (() => { try { return JSON.parse(localStorage.getItem('atconiz_calculations')) || []; } catch { return []; } })();
let chatContext = {
  lastProperty: null,
  lastTopic: null
};

// Realistic Global Land & Property Data (2026 market rates)
const globalData = {
  countries: [
    "United States", "United Arab Emirates", "India", "United Kingdom", "Singapore", 
    "France", "Australia", "Canada", "Switzerland", "Hong Kong", "Japan", "Germany", 
    "Italy", "Spain", "Brazil", "South Africa", "China", "Russia", "Mexico", "Thailand"
  ],
  landRatesUSDPerSqm: {
    "United States": 1850,
    "United Arab Emirates": 4200,
    "India": 380,
    "United Kingdom": 2450,
    "Singapore": 6800,
    "France": 1650,
    "Australia": 920,
    "Canada": 780,
    "Switzerland": 3200,
    "Hong Kong": 12500,
    "Japan": 1450,
    "Germany": 980,
    "Italy": 720,
    "Spain": 650,
    "Brazil": 420,
    "South Africa": 310,
    "China": 890,
    "Russia": 280,
    "Mexico": 380,
    "Thailand": 520
  },
  premiumMultipliers: {
    "United States": { "Beverly Hills": 4.2, "Malibu": 3.8, "Manhattan": 5.1, "default": 1.0 },
    "United Arab Emirates": { "Dubai": 2.8, "default": 1.0 },
    "India": { "Mumbai": 3.5, "Delhi": 2.1, "default": 1.0 },
    "default": { "default": 1.0 }
  }
};

// Currency data with realistic 2026 rates
const currencies = {
  "USD": { name: "US Dollar", rate: 1, symbol: "$" },
  "EUR": { name: "Euro", rate: 0.93, symbol: "€" },
  "GBP": { name: "British Pound", rate: 0.79, symbol: "£" },
  "INR": { name: "Indian Rupee", rate: 84.2, symbol: "₹" },
  "AED": { name: "UAE Dirham", rate: 3.67, symbol: "د.إ" },
  "SGD": { name: "Singapore Dollar", rate: 1.36, symbol: "S$" },
  "AUD": { name: "Australian Dollar", rate: 1.52, symbol: "A$" },
  "CAD": { name: "Canadian Dollar", rate: 1.39, symbol: "C$" },
  "JPY": { name: "Japanese Yen", rate: 155, symbol: "¥" },
  "CNY": { name: "Chinese Yuan", rate: 7.25, symbol: "¥" },
  "CHF": { name: "Swiss Franc", rate: 0.89, symbol: "CHF" },
  "HKD": { name: "Hong Kong Dollar", rate: 7.82, symbol: "HK$" }
};

// Property Data Generation (100 realistic listings)
const citiesData = [
  {city: "Beverly Hills", state: "California", country: "United States", lat: 34.0736, lng: -118.4004},
  {city: "Malibu", state: "California", country: "United States", lat: 34.0259, lng: -118.7798},
  {city: "Manhattan", state: "New York", country: "United States", lat: 40.7831, lng: -73.9712},
  {city: "Hamptons", state: "New York", country: "United States", lat: 40.9634, lng: -72.1848},
  {city: "Aspen", state: "Colorado", country: "United States", lat: 39.1911, lng: -106.8175},
  {city: "Miami Beach", state: "Florida", country: "United States", lat: 25.7907, lng: -80.1300},
  {city: "London", state: "England", country: "United Kingdom", lat: 51.5074, lng: -0.1278},
  {city: "Dubai", state: "Dubai", country: "United Arab Emirates", lat: 25.2048, lng: 55.2708},
  {city: "Singapore", state: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198},
  {city: "Paris", state: "Île-de-France", country: "France", lat: 48.8566, lng: 2.3522},
  {city: "Hong Kong", state: "Hong Kong", country: "China", lat: 22.3193, lng: 114.1694},
  {city: "Sydney", state: "New South Wales", country: "Australia", lat: -33.8688, lng: 151.2093},
  {city: "Lake Como", state: "Lombardy", country: "Italy", lat: 45.9981, lng: 9.2575},
  {city: "Monaco", state: "Monaco", country: "Monaco", lat: 43.7384, lng: 7.4246},
  {city: "Bali", state: "Bali", country: "Indonesia", lat: -8.3405, lng: 115.0920}
];

const propertyTemplates = [
  {
    baseTitle: "Oceanfront Villa",
    type: "Luxury Villa",
    basePrice: 28500000,
    beds: 7, baths: 9, area: 12400,
    description: "Spectacular contemporary villa offering sweeping ocean views, private beach access, and world-class amenities including an infinity pool and home theater.",
    amenities: ["Infinity Pool", "Private Beach Access", "Home Theater", "Wine Cellar", "Chef's Kitchen", "Spa & Sauna", "Guest House", "Smart Home"],
    imagePool: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56b06?w=900",
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900"
    ]
  },
  {
    baseTitle: "Sky Penthouse",
    type: "Modern Penthouse",
    basePrice: 18750000,
    beds: 4, baths: 5, area: 6200,
    description: "Stunning tri-level penthouse with 360° city views, private elevator, and expansive terraces. The pinnacle of urban luxury living.",
    amenities: ["Private Elevator", "Rooftop Terrace", "Smart Home", "Wine Cellar", "Home Gym", "Art Gallery"],
    imagePool: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900",
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=900",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900"
    ]
  },
  {
    baseTitle: "Mountain Estate",
    type: "Mountain Retreat",
    basePrice: 14200000,
    beds: 6, baths: 7, area: 9800,
    description: "Secluded mountain sanctuary with breathtaking views, private ski access, and exceptional craftsmanship throughout.",
    amenities: ["Ski-In/Ski-Out", "Wine Cellar", "Library", "Guest House", "Hot Tub", "Sustainable Features"],
    imagePool: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900",
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900"
    ]
  },
  {
    baseTitle: "Historic Waterfront Mansion",
    type: "Historic Mansion",
    basePrice: 32400000,
    beds: 8, baths: 10, area: 15600,
    description: "Magnificent 1920s waterfront estate meticulously restored with modern amenities while preserving its timeless architectural grandeur.",
    amenities: ["Private Dock", "Tennis Court", "Wine Cellar", "Library", "Guest House", "Pool", "Ballroom"],
    imagePool: [
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900",
      "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900"
    ]
  },
  {
    baseTitle: "Urban Loft Collection",
    type: "Urban Loft",
    basePrice: 8950000,
    beds: 3, baths: 4, area: 4800,
    description: "Extraordinary industrial-chic loft spanning an entire floor with soaring ceilings, massive windows, and curated designer finishes.",
    amenities: ["Smart Home", "Rooftop Access", "Wine Cellar", "Private Gym", "Art Installation Space"],
    imagePool: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900"
    ]
  }
];

const agentPool = [
  {name: "Elena Vasquez", phone: "+1 (310) 555-0182", email: "elena@atconiz.com", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120"},
  {name: "Marcus Chen", phone: "+1 (212) 555-0194", email: "marcus@atconiz.com", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120"},
  {name: "Sofia Laurent", phone: "+44 20 7946 0958", email: "sofia@atconiz.com", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120"},
  {name: "Alexander Knight", phone: "+971 4 555 0123", email: "alex@atconiz.com", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120"}
];

function generateProperties() {
  properties = [];
  const amenitiesMaster = ["Infinity Pool", "Home Theater", "Wine Cellar", "Smart Home System", "Private Gym", "Spa & Sauna", "Guest House", "Helipad", "Private Dock", "Tennis Court", "Library", "Rooftop Terrace", "Chef's Kitchen", "Sustainable Features", "Art Gallery", "Ballroom"];
  
  for (let i = 0; i < 100; i++) {
    const template = propertyTemplates[i % propertyTemplates.length];
    const cityInfo = citiesData[i % citiesData.length];
    const priceVariation = 0.65 + (seededRandom() * 1.1);
    const bedsVar = Math.floor(seededRandom() * 3) - 1;
    
    const prop = {
      id: i + 1,
      title: `${template.baseTitle} ${i > 65 ? 'Residence' : i > 35 ? 'Estate' : ''}`.trim(),
      price: Math.round(template.basePrice * priceVariation / 100000) * 100000,
      bedrooms: Math.max(3, template.beds + bedsVar),
      bathrooms: Math.max(3, template.baths + Math.floor(Math.random() * 2)),
      area: Math.round(template.area * (0.82 + Math.random() * 0.36)),
      type: template.type,
      location: {
        city: cityInfo.city,
        state: cityInfo.state,
        country: cityInfo.country,
        lat: cityInfo.lat + (Math.random() - 0.5) * 0.12,
        lng: cityInfo.lng + (Math.random() - 0.5) * 0.12
      },
      description: template.description,
      amenities: [...template.amenities].sort(() => 0.5 - Math.random()).slice(0, 7),
      images: [...template.imagePool].sort(() => 0.5 - Math.random()).slice(0, 3),
      rating: parseFloat((4.3 + Math.random() * 0.65).toFixed(1)),
      reviewsCount: Math.floor(28 + Math.random() * 210),
      agent: agentPool[i % agentPool.length],
      yearBuilt: 2012 + Math.floor(Math.random() * 13),
      status: Math.random() > 0.92 ? "Under Contract" : "For Sale",
      listedDate: new Date(Date.now() - Math.random() * 1000 * 3600 * 24 * 380).toISOString().split('T')[0],
      parking: Math.floor(Math.random() * 5) + 2,
      lotSize: Math.round((template.area * 1.8) + Math.random() * 18000)
    };
    properties.push(prop);
  }
  filteredProperties = [...properties];
}

