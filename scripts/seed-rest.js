/**
 * Seed via Firestore REST API using gcloud access token
 * Usage: TOKEN=$(gcloud auth print-access-token) node scripts/seed-rest.js
 */
const https = require('https');

const PROJECT = 'rustique-6b7c4';
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error('Set TOKEN env var: TOKEN=$(gcloud auth print-access-token) node scripts/seed-rest.js');
  process.exit(1);
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const k of Object.keys(val)) fields[k] = toFirestoreValue(val[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toDoc(data) {
  const fields = {};
  for (const k of Object.keys(data)) fields[k] = toFirestoreValue(data[k]);
  return { fields };
}

function postDoc(data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(toDoc(data));
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${PROJECT}/databases/(default)/documents/farmhouses`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const doc = JSON.parse(raw);
          resolve(doc.name.split('/').pop());
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const now = new Date().toISOString();

const DOCS = [
  // ── FARMHOUSES ────────────────────────────────────────────────────────────
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Sunrise Valley Farmhouse',
      area: 'Karjat',
      city: 'Raigad',
      capacity: '12',
      bedrooms: '4',
      description: 'Rustic farmhouse nestled in lush green valleys with open fields, bonfire area, and a private stream. Perfect for family getaways and weekend retreats away from city noise.',
      mapLink: 'https://maps.google.com/?q=18.9167,73.3167',
      propertyType: 'farmhouse',
      contactPhone1: '9876543210',
      contactPhone2: '',
    },
    pricing: { weeklyNight: '4500', weeklyDay: '3000', weekendNight: '6000', weekendDay: '4000', occasionalNight: '5500', occasionalDay: '3500', customPricing: [] },
    amenities: { pool: false, wifi: true, ac: false, parking: true, bonfire: 1, tv: 2, geyser: 3, chess: 1, carroms: 1, volleyball: 1 },
    rules: { petsNotAllowed: false, unmarriedNotAllowed: false, quietHours: true },
    photoUrls: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
    status: 'approved', ownerId: 'dummy_owner_1', rating: 4.3, reviews: 18,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 18.9167, longitude: 73.3167 },
  },
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Green Acres Retreat',
      area: 'Lonavala',
      city: 'Pune',
      capacity: '8',
      bedrooms: '3',
      description: 'Cozy farmhouse on 2 acres of mango orchards. Fresh air, morning bird songs, and freedom to pick fruits in season.',
      mapLink: 'https://maps.google.com/?q=18.7481,73.4072',
      propertyType: 'farmhouse',
      contactPhone1: '9876543211',
      contactPhone2: '',
    },
    pricing: { weeklyNight: '3500', weeklyDay: '2500', weekendNight: '5000', weekendDay: '3200', occasionalNight: '4500', occasionalDay: '3000', customPricing: [] },
    amenities: { pool: false, wifi: true, ac: false, parking: true, bonfire: 1, tv: 1, geyser: 2, chess: 1, carroms: 1, volleyball: 0 },
    rules: { petsNotAllowed: false, unmarriedNotAllowed: false, quietHours: true },
    photoUrls: ['https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800'],
    status: 'approved', ownerId: 'dummy_owner_2', rating: 4.6, reviews: 31,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 18.7481, longitude: 73.4072 },
  },
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Hilltop Farmstay',
      area: 'Igatpuri',
      city: 'Nashik',
      capacity: '15',
      bedrooms: '5',
      description: 'Large farmhouse on a hilltop with panoramic Sahyadri views. Campfire, stargazing deck, and nature trails.',
      mapLink: 'https://maps.google.com/?q=19.6967,73.5569',
      propertyType: 'farmhouse',
      contactPhone1: '9876543212',
      contactPhone2: '',
    },
    pricing: { weeklyNight: '7000', weeklyDay: '5000', weekendNight: '9000', weekendDay: '6500', occasionalNight: '8000', occasionalDay: '5500', customPricing: [] },
    amenities: { pool: false, wifi: true, ac: true, parking: true, bonfire: 2, tv: 3, geyser: 4, chess: 2, carroms: 2, volleyball: 1 },
    rules: { petsNotAllowed: true, unmarriedNotAllowed: false, quietHours: false },
    photoUrls: ['https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800', 'https://images.unsplash.com/photo-1587814213484-38ddc0a4f68d?w=800'],
    status: 'approved', ownerId: 'dummy_owner_3', rating: 4.1, reviews: 9,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 19.6967, longitude: 73.5569 },
  },

  // ── RESORTS ───────────────────────────────────────────────────────────────
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'The Meadows Resort & Spa',
      area: 'Mahabaleshwar',
      city: 'Satara',
      capacity: '60',
      bedrooms: '20',
      description: 'Premium hill resort with infinity pool, full-service spa, and multi-cuisine restaurant. Private balconies with valley views.',
      mapLink: 'https://maps.google.com/?q=17.9235,73.6586',
      propertyType: 'resort',
      contactPhone1: '9876543213',
      contactPhone2: '9876543214',
    },
    pricing: {
      weeklyNight: '12000', weeklyDay: '8000', weekendNight: '18000', weekendDay: '12000', occasionalNight: '15000', occasionalDay: '10000',
      customPricing: [{ name: 'Honeymoon Suite', price: '25000' }, { name: 'Full Resort Buyout', price: '200000' }],
    },
    amenities: { pool: true, wifi: true, ac: true, parking: true, bonfire: 0, tv: 20, geyser: 20, chess: 3, carroms: 2, volleyball: 1 },
    rules: { petsNotAllowed: true, unmarriedNotAllowed: false, quietHours: true },
    photoUrls: ['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800'],
    status: 'approved', ownerId: 'dummy_owner_4', rating: 4.7, reviews: 156,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 17.9235, longitude: 73.6586 },
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Lakeside Grand Resort',
      area: 'Pawna Lake',
      city: 'Pune',
      capacity: '40',
      bedrooms: '15',
      description: 'Luxury lakeside resort with private beach access, water sports, and gourmet dining. Kayaking, paddleboarding, and sunset bonfires.',
      mapLink: 'https://maps.google.com/?q=18.6637,73.4829',
      propertyType: 'resort',
      contactPhone1: '9876543215',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '9500', weeklyDay: '6500', weekendNight: '14000', weekendDay: '9000', occasionalNight: '11500', occasionalDay: '7500',
      customPricing: [{ name: 'Lake View Cottage', price: '16000' }],
    },
    amenities: { pool: true, wifi: true, ac: true, parking: true, bonfire: 2, tv: 15, geyser: 15, chess: 2, carroms: 2, volleyball: 1 },
    rules: { petsNotAllowed: false, unmarriedNotAllowed: false, quietHours: false },
    photoUrls: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800'],
    status: 'approved', ownerId: 'dummy_owner_5', rating: 4.5, reviews: 89,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 18.6637, longitude: 73.4829 },
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Jungle Canopy Resort',
      area: 'Matheran',
      city: 'Raigad',
      capacity: '30',
      bedrooms: '12',
      description: 'Eco-luxury resort inside protected forest. Tree-house cottages, guided jungle treks, and organic farm-to-table cuisine. No vehicles inside.',
      mapLink: 'https://maps.google.com/?q=18.9844,73.2656',
      propertyType: 'resort',
      contactPhone1: '9876543216',
      contactPhone2: '',
    },
    pricing: { weeklyNight: '11000', weeklyDay: '7500', weekendNight: '16000', weekendDay: '11000', occasionalNight: '13500', occasionalDay: '9000', customPricing: [] },
    amenities: { pool: false, wifi: false, ac: false, parking: true, bonfire: 1, tv: 0, geyser: 12, chess: 1, carroms: 1, volleyball: 0 },
    rules: { petsNotAllowed: true, unmarriedNotAllowed: false, quietHours: true },
    photoUrls: ['https://images.unsplash.com/photo-1617195737496-bc30194e3a19?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800'],
    status: 'approved', ownerId: 'dummy_owner_6', rating: 4.8, reviews: 44,
    bookedDates: [], blockedDates: [], coordinates: { latitude: 18.9844, longitude: 73.2656 },
  },
];

async function seed() {
  for (const doc of DOCS) {
    const id = await postDoc(doc);
    console.log(`✓ ${doc.basicDetails.name} (${doc.propertyType}) → ${id}`);
  }
  console.log(`\nDone! Seeded ${DOCS.length} properties.`);
}

seed().catch(err => { console.error('Failed:', err.message); process.exit(1); });
