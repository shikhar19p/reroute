/**
 * Seed script: adds dummy farmhouse and resort documents to Firestore
 * Run: node scripts/seed-dummy-properties.js
 * Requires: firebase CLI logged in (uses application default credentials)
 */
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'rustique-6b7c4',
});

const db = getFirestore();

const FARMHOUSES = [
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Sunrise Valley Farmhouse',
      area: 'Karjat',
      city: 'Raigad',
      capacity: '12',
      bedrooms: '4',
      description:
        'A rustic farmhouse nestled in lush green valleys with open fields, bonfire area, and a private stream. Perfect for family getaways and weekend retreats away from city noise.',
      mapLink: 'https://maps.google.com/?q=18.9167,73.3167',
      propertyType: 'farmhouse',
      contactPhone1: '9876543210',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '4500',
      weeklyDay: '3000',
      weekendNight: '6000',
      weekendDay: '4000',
      occasionalNight: '5500',
      occasionalDay: '3500',
      customPricing: [],
    },
    amenities: {
      pool: false,
      wifi: true,
      ac: false,
      parking: true,
      bonfire: 1,
      tv: 2,
      geyser: 3,
      chess: 1,
      carroms: 1,
      volleyball: 1,
    },
    rules: {
      petsNotAllowed: false,
      unmarriedNotAllowed: false,
      quietHours: true,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_1',
    rating: 4.3,
    reviews: 18,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 18.9167, longitude: 73.3167 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Green Acres Retreat',
      area: 'Lonavala',
      city: 'Pune',
      capacity: '8',
      bedrooms: '3',
      description:
        'Cozy farmhouse on 2 acres of land surrounded by mango orchards. Enjoy fresh air, morning bird songs, and the freedom to pick your own fruits in season.',
      mapLink: 'https://maps.google.com/?q=18.7481,73.4072',
      propertyType: 'farmhouse',
      contactPhone1: '9876543211',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '3500',
      weeklyDay: '2500',
      weekendNight: '5000',
      weekendDay: '3200',
      occasionalNight: '4500',
      occasionalDay: '3000',
      customPricing: [],
    },
    amenities: {
      pool: false,
      wifi: true,
      ac: false,
      parking: true,
      bonfire: 1,
      tv: 1,
      geyser: 2,
      chess: 1,
      carroms: 1,
      volleyball: 0,
    },
    rules: {
      petsNotAllowed: false,
      unmarriedNotAllowed: false,
      quietHours: true,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800',
      'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_2',
    rating: 4.6,
    reviews: 31,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 18.7481, longitude: 73.4072 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
  {
    propertyType: 'farmhouse',
    basicDetails: {
      name: 'Hilltop Farmstay',
      area: 'Igatpuri',
      city: 'Nashik',
      capacity: '15',
      bedrooms: '5',
      description:
        'Large farmhouse on a hilltop with panoramic views of the Sahyadri range. Ideal for large groups and corporate offsites. Campfire, stargazing deck, and nature trails included.',
      mapLink: 'https://maps.google.com/?q=19.6967,73.5569',
      propertyType: 'farmhouse',
      contactPhone1: '9876543212',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '7000',
      weeklyDay: '5000',
      weekendNight: '9000',
      weekendDay: '6500',
      occasionalNight: '8000',
      occasionalDay: '5500',
      customPricing: [],
    },
    amenities: {
      pool: false,
      wifi: true,
      ac: true,
      parking: true,
      bonfire: 2,
      tv: 3,
      geyser: 4,
      chess: 2,
      carroms: 2,
      volleyball: 1,
    },
    rules: {
      petsNotAllowed: true,
      unmarriedNotAllowed: false,
      quietHours: false,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800',
      'https://images.unsplash.com/photo-1587814213484-38ddc0a4f68d?w=800',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_3',
    rating: 4.1,
    reviews: 9,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 19.6967, longitude: 73.5569 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
];

const RESORTS = [
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'The Meadows Resort & Spa',
      area: 'Mahabaleshwar',
      city: 'Satara',
      capacity: '60',
      bedrooms: '20',
      description:
        'A premium hill resort offering world-class amenities including an infinity pool, full-service spa, and multi-cuisine restaurant. Each room has private balconies with valley views.',
      mapLink: 'https://maps.google.com/?q=17.9235,73.6586',
      propertyType: 'resort',
      contactPhone1: '9876543213',
      contactPhone2: '9876543214',
    },
    pricing: {
      weeklyNight: '12000',
      weeklyDay: '8000',
      weekendNight: '18000',
      weekendDay: '12000',
      occasionalNight: '15000',
      occasionalDay: '10000',
      customPricing: [
        { name: 'Honeymoon Suite (per night)', price: '25000' },
        { name: 'Full Resort Buyout (per day)', price: '200000' },
      ],
    },
    amenities: {
      pool: true,
      wifi: true,
      ac: true,
      parking: true,
      restaurant: true,
      spa: true,
      bonfire: 0,
      tv: 20,
      geyser: 20,
      chess: 3,
      carroms: 2,
      volleyball: 1,
    },
    rules: {
      petsNotAllowed: true,
      unmarriedNotAllowed: false,
      quietHours: true,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_4',
    rating: 4.7,
    reviews: 156,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 17.9235, longitude: 73.6586 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Lakeside Grand Resort',
      area: 'Pawna Lake',
      city: 'Pune',
      capacity: '40',
      bedrooms: '15',
      description:
        'Luxury lakeside resort with private beach access, water sports, and gourmet dining. Enjoy kayaking, paddleboarding, and evening bonfires by the lake with stunning sunset views.',
      mapLink: 'https://maps.google.com/?q=18.6637,73.4829',
      propertyType: 'resort',
      contactPhone1: '9876543215',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '9500',
      weeklyDay: '6500',
      weekendNight: '14000',
      weekendDay: '9000',
      occasionalNight: '11500',
      occasionalDay: '7500',
      customPricing: [
        { name: 'Lake View Cottage (per night)', price: '16000' },
      ],
    },
    amenities: {
      pool: true,
      wifi: true,
      ac: true,
      parking: true,
      restaurant: true,
      bonfire: 2,
      tv: 15,
      geyser: 15,
      chess: 2,
      carroms: 2,
      volleyball: 1,
    },
    rules: {
      petsNotAllowed: false,
      unmarriedNotAllowed: false,
      quietHours: false,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800',
      'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800',
      'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_5',
    rating: 4.5,
    reviews: 89,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 18.6637, longitude: 73.4829 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
  {
    propertyType: 'resort',
    basicDetails: {
      name: 'Jungle Canopy Resort',
      area: 'Matheran',
      city: 'Raigad',
      capacity: '30',
      bedrooms: '12',
      description:
        'Eco-luxury resort inside a protected forest zone. Tree-house style cottages with open-air showers, guided jungle treks, and organic farm-to-table cuisine. No vehicles inside; accessible by horse or foot.',
      mapLink: 'https://maps.google.com/?q=18.9844,73.2656',
      propertyType: 'resort',
      contactPhone1: '9876543216',
      contactPhone2: '',
    },
    pricing: {
      weeklyNight: '11000',
      weeklyDay: '7500',
      weekendNight: '16000',
      weekendDay: '11000',
      occasionalNight: '13500',
      occasionalDay: '9000',
      customPricing: [],
    },
    amenities: {
      pool: false,
      wifi: false,
      ac: false,
      parking: true,
      restaurant: true,
      bonfire: 1,
      tv: 0,
      geyser: 12,
      chess: 1,
      carroms: 1,
      volleyball: 0,
    },
    rules: {
      petsNotAllowed: true,
      unmarriedNotAllowed: false,
      quietHours: true,
    },
    photoUrls: [
      'https://images.unsplash.com/photo-1617195737496-bc30194e3a19?w=800',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
    ],
    status: 'approved',
    ownerId: 'dummy_owner_6',
    rating: 4.8,
    reviews: 44,
    bookedDates: [],
    blockedDates: [],
    coordinates: { latitude: 18.9844, longitude: 73.2656 },
    createdAt: Timestamp.now(),
    approvedAt: Timestamp.now(),
  },
];

async function seed() {
  const all = [...FARMHOUSES, ...RESORTS];
  const batch = db.batch();

  for (const doc of all) {
    const ref = db.collection('farmhouses').doc();
    batch.set(ref, doc);
    console.log(`Queued: ${doc.basicDetails.name} (${doc.propertyType}) → ${ref.id}`);
  }

  await batch.commit();
  console.log(`\nSeeded ${FARMHOUSES.length} farmhouses + ${RESORTS.length} resorts successfully.`);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
