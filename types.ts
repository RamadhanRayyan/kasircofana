
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  KASIR = 'kasir'
}

export enum Category {
  MAKANAN = 'Makanan',
  MINUMAN = 'Minuman',
  LAINNYA = 'Lainnya'
}

export interface CooperativeAccount {
  id: string;
  name: string;
  address: string;
  phone: string;
}

export interface ProductVariant {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  branch_id?: string;
  sku?: string;
  name: string;
  category: Category;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  variants?: ProductVariant[];
}

export interface CartItem extends Product {
  quantity: number;
  selectedVariants?: ProductVariant[];
}

export interface Transaction {
  id: string;
  branch_id?: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'Cash';
  date: string; // ISO String
}

export interface ReportStats {
  totalRevenue: number;
  totalProfit: number;
  transactionCount: number;
  topProducts: { name: string; quantity: number }[];
}
