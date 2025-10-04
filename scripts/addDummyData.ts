import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfigNode';

const dummyFarmhouses = [
  {
    name: 'Sunset Valley Farmhouse',
    location: 'Shamirpet Lake Road, Shamirpet',
    city: 'Hyderabad',
    area: 'Shamirpet',
    mapLink: 'https://maps.google.com/?q=17.5937,78.5074',
    bedrooms: 4,
    capacity: 12,
    description: 'Beautiful farmhouse with lake view, perfect for weekend getaways. Features spacious rooms, outdoor seating, and modern amenities.',
    price: 8000,
    weekendPrice: 12000,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
    amenities: {
      tv: 2,
      geyser: 3,
      bonfire: 1,
      chess: 1,
      carroms: 1,
      volleyball: 1,
      pool: true,
    },
    rules: {
      unmarriedCouples: true,
      pets: true,
      quietHours: true,
    },
    coordinates: {
      latitude: 17.5937,
      longitude: 78.5074,
    },
    ownerId: 'demo_owner_1',
    ownerEmail: 'owner1@example.com',
    status: 'approved',
    rating: 4.5,
    reviews: 23,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    kyc: {
      aadhaarFront: '',
      aadhaarBack: '',
      panCard: '',
      labourLicense: '',
      bankAccountHolder: 'John Doe',
      bankAccountNumber: '1234567890',
      ifscCode: 'HDFC0001234',
      branch: 'Shamirpet',
    },
  },
  {
    name: 'Green Acres Retreat',
    location: 'Chevella Road, Near ORR',
    city: 'Hyderabad',
    area: 'Chevella',
    mapLink: 'https://maps.google.com/?q=17.2543,78.1234',
    bedrooms: 5,
    capacity: 15,
    description: 'Luxury farmhouse surrounded by lush greenery. Ideal for corporate events, family gatherings, and celebrations.',
    price: 10000,
    weekendPrice: 15000,
    photos: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
    ],
    amenities: {
      tv: 3,
      geyser: 5,
      bonfire: 2,
      chess: 2,
      carroms: 2,
      volleyball: 1,
      pool: true,
    },
    rules: {
      unmarriedCouples: false,
      pets: true,
      quietHours: true,
    },
    coordinates: {
      latitude: 17.2543,
      longitude: 78.1234,
    },
    ownerId: 'demo_owner_2',
    ownerEmail: 'owner2@example.com',
    status: 'approved',
    rating: 4.8,
    reviews: 45,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    kyc: {
      aadhaarFront: '',
      aadhaarBack: '',
      panCard: '',
      labourLicense: '',
      bankAccountHolder: 'Jane Smith',
      bankAccountNumber: '9876543210',
      ifscCode: 'ICIC0001234',
      branch: 'Chevella',
    },
  },
  {
    name: 'Riverside Paradise',
    location: 'Moinabad Village Road',
    city: 'Hyderabad',
    area: 'Moinabad',
    mapLink: 'https://maps.google.com/?q=17.3876,78.2543',
    bedrooms: 3,
    capacity: 10,
    description: 'Cozy farmhouse by the river with beautiful sunrise views. Perfect for small groups and intimate gatherings.',
    price: 6000,
    weekendPrice: 9000,
    photos: [
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=800',
    ],
    amenities: {
      tv: 1,
      geyser: 2,
      bonfire: 1,
      chess: 1,
      carroms: 1,
      volleyball: 0,
      pool: false,
    },
    rules: {
      unmarriedCouples: true,
      pets: false,
      quietHours: true,
    },
    coordinates: {
      latitude: 17.3876,
      longitude: 78.2543,
    },
    ownerId: 'demo_owner_3',
    ownerEmail: 'owner3@example.com',
    status: 'approved',
    rating: 4.2,
    reviews: 18,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    kyc: {
      aadhaarFront: '',
      aadhaarBack: '',
      panCard: '',
      labourLicense: '',
      bankAccountHolder: 'Raj Kumar',
      bankAccountNumber: '5555666677',
      ifscCode: 'SBI00012345',
      branch: 'Moinabad',
    },
  },
  {
    name: 'Mountain View Estate',
    location: 'Vikarabad Highway, Km 45',
    city: 'Hyderabad',
    area: 'Vikarabad',
    mapLink: 'https://maps.google.com/?q=17.3345,77.9012',
    bedrooms: 6,
    capacity: 20,
    description: 'Sprawling estate with mountain views and extensive outdoor space. Features include multiple sitting areas, outdoor kitchen, and sports facilities.',
    price: 15000,
    weekendPrice: 20000,
    customPricing: [
      { label: 'New Year Eve', price: 30000 },
      { label: 'Festival Season', price: 25000 },
    ],
    photos: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
    ],
    amenities: {
      tv: 4,
      geyser: 6,
      bonfire: 2,
      chess: 2,
      carroms: 2,
      volleyball: 1,
      pool: true,
    },
    rules: {
      unmarriedCouples: true,
      pets: true,
      quietHours: false,
    },
    coordinates: {
      latitude: 17.3345,
      longitude: 77.9012,
    },
    ownerId: 'demo_owner_4',
    ownerEmail: 'owner4@example.com',
    status: 'approved',
    rating: 4.9,
    reviews: 67,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    kyc: {
      aadhaarFront: '',
      aadhaarBack: '',
      panCard: '',
      labourLicense: '',
      bankAccountHolder: 'Priya Reddy',
      bankAccountNumber: '8888999900',
      ifscCode: 'AXIS0001234',
      branch: 'Vikarabad',
    },
  },
  {
    name: 'Tranquil Oaks Farmhouse',
    location: 'Kollur Lake Area',
    city: 'Hyderabad',
    area: 'Kollur',
    mapLink: 'https://maps.google.com/?q=17.4532,78.3891',
    bedrooms: 4,
    capacity: 12,
    description: 'Peaceful farmhouse near Kollur Lake with beautiful oak trees. Great for nature lovers and photography enthusiasts.',
    price: 7000,
    weekendPrice: 10000,
    photos: [
      'https://images.unsplash.com/photo-1600563438938-a650a5f2e8e3?w=800',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    ],
    amenities: {
      tv: 2,
      geyser: 3,
      bonfire: 1,
      chess: 1,
      carroms: 1,
      volleyball: 1,
      pool: false,
    },
    rules: {
      unmarriedCouples: true,
      pets: true,
      quietHours: true,
    },
    coordinates: {
      latitude: 17.4532,
      longitude: 78.3891,
    },
    ownerId: 'demo_owner_5',
    ownerEmail: 'owner5@example.com',
    status: 'approved',
    rating: 4.3,
    reviews: 31,
    createdAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    kyc: {
      aadhaarFront: '',
      aadhaarBack: '',
      panCard: '',
      labourLicense: '',
      bankAccountHolder: 'Suresh Naidu',
      bankAccountNumber: '1111222233',
      ifscCode: 'HDFC0005678',
      branch: 'Kollur',
    },
  },
];

async function addDummyData() {
  console.log('Starting to add dummy farmhouse data...');

  try {
    for (let i = 0; i < dummyFarmhouses.length; i++) {
      const farmhouse = dummyFarmhouses[i];
      const docRef = await addDoc(collection(db, 'farmhouses'), farmhouse);
      console.log(`✓ Added: ${farmhouse.name} (ID: ${docRef.id})`);
    }

    console.log('\n✅ Successfully added all dummy farmhouses!');
    console.log('Total farmhouses added:', dummyFarmhouses.length);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding dummy data:', error);
    process.exit(1);
  }
}

// Run the script
addDummyData();
