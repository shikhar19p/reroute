import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';

export interface Booking {
  id: string;
  farmhouseId: string;
  farmhouseName: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string | null;
  bookingType: 'dayuse' | 'overnight';
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'draft';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
  category?: 'past' | 'present' | 'future' | 'draft';
}

export interface Farmhouse {
  id: string;
  name: string;
  location: string;
  price: number;
  weekendPrice: number;
  extraGuestPrice?: number; // Added this field
  rating: number;
  reviews: number;
  capacity: number;
  bedrooms: number;
  description: string;
  photos: string[];
  amenities: {
    tv: number;
    geyser: number;
    bonfire: number;
    chess: number;
    carroms: number;
    volleyball: number;
    pool: boolean;
  };
  rules: {
    unmarriedCouples: boolean;
    pets: boolean;
    quietHours: boolean;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  mapLink?: string;
  customPricing?: Array<{
    label: string;
    price: number;
  }>;
  bookedDates?: string[];
}

export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  age?: number;
  address?: string;
  gender?: string;
}

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  RoleChoice: undefined;

  // Owner
  MyFarmhouses: undefined;
  FarmhouseDetailOwner: { farmhouseId: string };
  EditFarmhouse: { farmhouse: Farmhouse };
  OwnerBookings: { farmhouseId?: string } | undefined;
  OwnerBookingDetails: { booking: Booking };
  ManageBlockedDates: { farmhouseId: string };

  // Farm Registration
  FarmBasicDetails: undefined;
  FarmPrices: undefined;
  FarmPhotos: undefined;
  FarmAmenitiesGames: undefined;
  FarmRulesRestrictions: undefined;
  FarmKyc: undefined;

  // Admin
  AdminHome: undefined;
  AdminEditFarm: { farmId: string };

  // User
  UserHome: { screen?: string };
  FarmhouseDetail: { farmhouse: Farmhouse; draftData?: any };
  AllAmenities: { amenities: string[] };
  AllReviews: { farmhouseId: string };
  BookingConfirmation: {
    farmhouseId: string;
    farmhouseName: string;
    farmhouseImage: string;
    location: string;
    startDate: string;
    endDate: string;
    guestCount: number;
    totalPrice: number;
    numberOfNights: number;
    bookingType: string;
    capacity: number;
    rooms: number;
  };
  BookingDetails: { booking: Booking };
  EditProfile: { profile: UserProfile };
};

export type TabParamList = {
  Explore: undefined;
  Bookings: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
