export type OrderStatus = 
  | "waiting_payment"
  | "received" 
  | "washing" 
  | "ironing" 
  | "ready" 
  | "completed"
  | "cancelled";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: StatusUpdate[];
  notes?: string;
  totalPrice: number;
  payment_status?: string; // unpaid | paid
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface StatusUpdate {
  status: OrderStatus;
  timestamp: Date;
  updatedBy?: string;
  notes?: string;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  waiting_payment: "Menunggu Pembayaran",
  received: "Diterima",
  washing: "Dicuci",
  ironing: "Disetrika",
  ready: "Siap Diambil",
  completed: "Selesai",
  cancelled: "Batal"
};

export const orderStatusClasses: Record<OrderStatus, string> = {
  waiting_payment: "status-waiting-payment",
  received: "status-received",
  washing: "status-washing",
  ironing: "status-ironing",
  ready: "status-ready",
  completed: "status-completed",
  cancelled: "status-cancelled"
};

// Helper function to get the next status in the flow
export function getNextOrderStatus(status: OrderStatus): OrderStatus | null {
  switch (status) {
    case "received":
      return "washing";
    case "washing":
      return "ironing";
    case "ironing":
      return "ready";
    case "ready":
      return "completed";
    case "completed":
      return null;
    case "cancelled":
      return null;
    default:
      return null;
  }
}

// Mock data for orders
export const mockOrders: Order[] = [
  {
    id: "ORD001",
    customerId: "CUST001",
    customerName: "Budi Santoso",
    customerPhone: "6281234567890",
    items: [
      { id: "ITEM001", name: "Cuci + Setrika Reguler", quantity: 5, price: 7000 },
      { id: "ITEM002", name: "Dry Cleaning", quantity: 1, price: 25000 }
    ],
    status: "received",
    createdAt: new Date(2025, 4, 8, 10, 30),
    updatedAt: new Date(2025, 4, 8, 10, 30),
    statusHistory: [
      { status: "received", timestamp: new Date(2025, 4, 8, 10, 30) }
    ],
    totalPrice: 60000
  },
  {
    id: "ORD002",
    customerId: "CUST002",
    customerName: "Siti Rahayu",
    customerPhone: "6285678901234",
    items: [
      { id: "ITEM003", name: "Cuci + Setrika Express", quantity: 3, price: 10000 }
    ],
    status: "washing",
    createdAt: new Date(2025, 4, 7, 15, 45),
    updatedAt: new Date(2025, 4, 8, 9, 15),
    statusHistory: [
      { status: "received", timestamp: new Date(2025, 4, 7, 15, 45) },
      { status: "washing", timestamp: new Date(2025, 4, 8, 9, 15) }
    ],
    totalPrice: 30000
  },
  {
    id: "ORD003",
    customerId: "CUST003",
    customerName: "Ahmad Hidayat",
    customerPhone: "6289012345678",
    items: [
      { id: "ITEM004", name: "Cuci + Setrika Reguler", quantity: 8, price: 7000 },
      { id: "ITEM005", name: "Bed Cover", quantity: 2, price: 35000 }
    ],
    status: "ironing",
    createdAt: new Date(2025, 4, 6, 11, 20),
    updatedAt: new Date(2025, 4, 8, 14, 0),
    statusHistory: [
      { status: "received", timestamp: new Date(2025, 4, 6, 11, 20) },
      { status: "washing", timestamp: new Date(2025, 4, 7, 9, 30) },
      { status: "ironing", timestamp: new Date(2025, 4, 8, 14, 0) }
    ],
    totalPrice: 126000
  },
  {
    id: "ORD004",
    customerId: "CUST004",
    customerName: "Dewi Anggraini",
    customerPhone: "6282345678901",
    items: [
      { id: "ITEM006", name: "Dry Cleaning", quantity: 3, price: 25000 }
    ],
    status: "ready",
    createdAt: new Date(2025, 4, 5, 14, 0),
    updatedAt: new Date(2025, 4, 8, 16, 30),
    statusHistory: [
      { status: "received", timestamp: new Date(2025, 4, 5, 14, 0) },
      { status: "washing", timestamp: new Date(2025, 4, 6, 10, 15) },
      { status: "ironing", timestamp: new Date(2025, 4, 7, 15, 45) },
      { status: "ready", timestamp: new Date(2025, 4, 8, 16, 30) }
    ],
    totalPrice: 75000
  },
  {
    id: "ORD005",
    customerId: "CUST005",
    customerName: "Rudi Hartono",
    customerPhone: "6287654321098",
    items: [
      { id: "ITEM007", name: "Cuci + Setrika Reguler", quantity: 10, price: 7000 }
    ],
    status: "completed",
    createdAt: new Date(2025, 4, 4, 9, 0),
    updatedAt: new Date(2025, 4, 7, 11, 0),
    statusHistory: [
      { status: "received", timestamp: new Date(2025, 4, 4, 9, 0) },
      { status: "washing", timestamp: new Date(2025, 4, 5, 10, 30) },
      { status: "ironing", timestamp: new Date(2025, 4, 6, 14, 15) },
      { status: "ready", timestamp: new Date(2025, 4, 7, 9, 45) },
      { status: "completed", timestamp: new Date(2025, 4, 7, 11, 0) }
    ],
    totalPrice: 70000
  }
];
