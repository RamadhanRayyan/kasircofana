
import { Product, Category, CooperativeAccount } from './types';

export const INITIAL_ACCOUNTS: CooperativeAccount[] = [
  {
    id: '1',
    name: 'Cofana Shop - Pusat',
    address: 'Jl. Ahmad Yani No. 10, Jakarta',
    phone: '021-1234567'
  },
  {
    id: '2',
    name: 'Cofana Shop - Cabang Depok',
    address: 'Jl. Margonda Raya No. 45, Depok',
    phone: '021-7654321'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Beras Premium 5kg',
    category: Category.MAKANAN,
    price: 75000,
    cost: 68000,
    stock: 25,
    minStock: 10
  },
  {
    id: '2',
    name: 'Minyak Goreng 2L',
    category: Category.MAKANAN,
    price: 34000,
    cost: 30000,
    stock: 8,
    minStock: 15
  },
  {
    id: '3',
    name: 'Indomie Goreng',
    category: Category.MAKANAN,
    price: 3500,
    cost: 2800,
    stock: 120,
    minStock: 40
  },
  {
    id: '4',
    name: 'Air Mineral 600ml',
    category: Category.MINUMAN,
    price: 4000,
    cost: 2500,
    stock: 48,
    minStock: 24
  },
  {
    id: '5',
    name: 'Buku Tulis Sidu 38',
    category: Category.LAINNYA,
    price: 45000,
    cost: 38000,
    stock: 5,
    minStock: 12
  }
];
