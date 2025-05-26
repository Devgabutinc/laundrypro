export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  stock_quantity: number;
  // Properti untuk menampilkan stok yang sudah dikurangi stok sementara di UI
  stock_quantity_display?: number;
  unit: string;
  created_at: Date | string;
  updated_at: Date | string;
}

// We'll keep the mock products for fallback but will primarily use data from Supabase
export const mockProducts: Product[] = [
  {
    id: "PRD001",
    name: "Deterjen Bubuk Premium",
    description: "Deterjen khusus untuk laundry premium",
    price: 50000,
    category: "cleaning",
    stock_quantity: 20,
    unit: "kg",
    created_at: new Date(2025, 3, 15),
    updated_at: new Date(2025, 3, 15)
  },
  {
    id: "PRD002",
    name: "Pelembut Pakaian",
    description: "Pelembut pakaian aroma lavender",
    price: 35000,
    category: "cleaning",
    stock_quantity: 15,
    unit: "liter",
    created_at: new Date(2025, 3, 10),
    updated_at: new Date(2025, 3, 10)
  },
  {
    id: "PRD003",
    name: "Pemutih Pakaian",
    description: "Pemutih pakaian aman untuk semua jenis kain",
    price: 25000,
    category: "cleaning",
    stock_quantity: 8,
    unit: "liter",
    created_at: new Date(2025, 4, 5),
    updated_at: new Date(2025, 4, 5)
  },
  {
    id: "PRD004",
    name: "Hanger Premium",
    description: "Hanger anti karat untuk pakaian",
    price: 5000,
    category: "equipment",
    stock_quantity: 100,
    unit: "pcs",
    created_at: new Date(2025, 4, 1),
    updated_at: new Date(2025, 4, 1)
  },
  {
    id: "PRD005",
    name: "Plastik Pembungkus",
    description: "Plastik pembungkus pakaian transparan",
    price: 15000,
    category: "packaging",
    stock_quantity: 50,
    unit: "roll",
    created_at: new Date(2025, 3, 20),
    updated_at: new Date(2025, 3, 20)
  }
];
