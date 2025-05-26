
import { Order } from "./Order";
import { Product } from "./Product";

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  related_order_id?: string;
  related_product_id?: string;
  date: string;
  created_at: string;
  payment_method: "cash" | "transfer" | "qris" | "credit";
  status: "pending" | "completed" | "cancelled";
}

export const mockTransactions: Transaction[] = [
  {
    id: "TRX001",
    type: "income",
    amount: 60000,
    description: "Pembayaran Pesanan #ORD001",
    category: "order",
    related_order_id: "ORD001",
    date: new Date(2025, 4, 8, 11, 30).toISOString(),
    created_at: new Date(2025, 4, 8, 11, 30).toISOString(),
    payment_method: "cash",
    status: "completed"
  },
  {
    id: "TRX002",
    type: "income",
    amount: 30000,
    description: "Pembayaran Pesanan #ORD002",
    category: "order",
    related_order_id: "ORD002",
    date: new Date(2025, 4, 7, 16, 45).toISOString(),
    created_at: new Date(2025, 4, 7, 16, 45).toISOString(),
    payment_method: "transfer",
    status: "completed"
  },
  {
    id: "TRX003",
    type: "expense",
    amount: 500000,
    description: "Pembelian Stok Deterjen",
    category: "inventory",
    related_product_id: "PRD001",
    date: new Date(2025, 4, 5, 9, 0).toISOString(),
    created_at: new Date(2025, 4, 5, 9, 0).toISOString(),
    payment_method: "transfer",
    status: "completed"
  },
  {
    id: "TRX004",
    type: "expense",
    amount: 200000,
    description: "Pembayaran Listrik",
    category: "utilities",
    date: new Date(2025, 4, 3, 14, 30).toISOString(),
    created_at: new Date(2025, 4, 3, 14, 30).toISOString(),
    payment_method: "transfer",
    status: "completed"
  },
  {
    id: "TRX005",
    type: "income",
    amount: 126000,
    description: "Pembayaran Pesanan #ORD003",
    category: "order",
    related_order_id: "ORD003",
    date: new Date(2025, 4, 6, 12, 0).toISOString(),
    created_at: new Date(2025, 4, 6, 12, 0).toISOString(),
    payment_method: "qris",
    status: "completed"
  }
];
