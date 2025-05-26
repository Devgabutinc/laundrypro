export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  created_at: Date | string;
  updated_at: Date | string;
  unit?: string;
}

// Contoh mock data
export const mockServices: Service[] = [
  {
    id: "SVC001",
    name: "Setrika Saja",
    description: "Jasa setrika pakaian per kg",
    price: 7000,
    category: "setrika",
    created_at: new Date(2025, 4, 1),
    updated_at: new Date(2025, 4, 1)
  },
  {
    id: "SVC002",
    name: "Cuci Kering",
    description: "Cuci dan kering tanpa setrika",
    price: 8000,
    category: "cuci",
    created_at: new Date(2025, 4, 1),
    updated_at: new Date(2025, 4, 1)
  }
]; 