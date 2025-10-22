export interface User {
  user_id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'owner' | 'admin';
  kyc_status?: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  created_at: any;
  owner_kyc?: OwnerKYC;
}

export interface OwnerKYC {
  person1_name: string;
  person1_phone: string;
  person1_aadhaar_url: string;
  person2_name: string;
  person2_phone: string;
  person2_aadhaar_url: string;
  company_pan_url: string;
  labour_licence_url: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Farmhouse {
  farmhouse_id: string;
  owner_id: string;
  name: string;
  location: string;
  description: string;
  images: string[];
  amenities: string[];
  rules: string[];
  base_rate: number;
  weekend_rate: number;
  seasonal_rates?: any;
  status: 'pending_approval' | 'active' | 'rejected';
  max_guests: number;
  commission_percentage?: number;
  approved_by?: string;
  approved_at?: any;
  rejection_reason?: string;
  created_at: any;
}

export interface Booking {
  booking_id: string;
  user_id: string;
  farmhouse_id: string;
  owner_id: string;
  start_date: any;
  end_date: any;
  guest_count: number;
  total_amount: number;
  discount_amount: number;
  payment_status: 'pending' | 'paid' | 'refunded';
  status: 'confirmed' | 'cancelled' | 'completed';
  commission_amount: number;
  commission_paid_to_owner: boolean;
  created_at: any;
  coupon_code?: string;
}

export interface Coupon {
  coupon_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  valid_from: any;
  valid_until: any;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  min_booking_amount?: number;
  description?: string;
  created_at: any;
}

export interface CouponUsage {
  user_id: string;
  coupon_id: string;
  booking_id: string;
  discount_applied: number;
  used_at: any;
}

export interface DashboardStats {
  totalFarmhouses: number;
  pendingFarmhouses: number;
  totalUsers: number;
  totalBookings: number;
  activeCoupons: number;
  todayBookings: number;
  weekBookings: number;
  monthBookings: number;
}