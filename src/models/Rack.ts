
import { Order } from "./Order";

export interface RackSlot {
  id: string;
  rack_id: string;
  position: string;
  occupied: boolean;
  order_id?: string;
  assigned_at?: string;
  due_date?: string;
}

export interface Rack {
  id: string;
  name: string;
  description: string;
  total_slots: number;
  available_slots: number;
  slots: RackSlot[];
}

export const mockRacks: Rack[] = [
  {
    id: "RACK001",
    name: "Rak Pakaian A",
    description: "Rak utama untuk pakaian regular",
    total_slots: 10,
    available_slots: 7,
    slots: [
      {
        id: "SLOT001",
        rack_id: "RACK001",
        position: "A1",
        occupied: true,
        order_id: "ORD001",
        assigned_at: new Date(2025, 4, 8, 10, 30).toISOString(),
        due_date: new Date(2025, 4, 10, 17, 0).toISOString()
      },
      {
        id: "SLOT002",
        rack_id: "RACK001",
        position: "A2",
        occupied: true,
        order_id: "ORD002",
        assigned_at: new Date(2025, 4, 7, 15, 45).toISOString(),
        due_date: new Date(2025, 4, 9, 17, 0).toISOString()
      },
      {
        id: "SLOT003",
        rack_id: "RACK001",
        position: "A3",
        occupied: true,
        order_id: "ORD003",
        assigned_at: new Date(2025, 4, 6, 11, 20).toISOString(),
        due_date: new Date(2025, 4, 9, 17, 0).toISOString()
      },
      {
        id: "SLOT004",
        rack_id: "RACK001",
        position: "A4",
        occupied: false
      },
      {
        id: "SLOT005",
        rack_id: "RACK001",
        position: "A5",
        occupied: false
      },
      {
        id: "SLOT006",
        rack_id: "RACK001",
        position: "A6",
        occupied: false
      },
      {
        id: "SLOT007",
        rack_id: "RACK001",
        position: "A7",
        occupied: false
      },
      {
        id: "SLOT008",
        rack_id: "RACK001",
        position: "A8",
        occupied: false
      },
      {
        id: "SLOT009",
        rack_id: "RACK001",
        position: "A9",
        occupied: false
      },
      {
        id: "SLOT010",
        rack_id: "RACK001",
        position: "A10",
        occupied: false
      }
    ]
  },
  {
    id: "RACK002",
    name: "Rak Pakaian B",
    description: "Rak untuk pakaian premium dan dry cleaning",
    total_slots: 8,
    available_slots: 6,
    slots: [
      {
        id: "SLOT011",
        rack_id: "RACK002",
        position: "B1",
        occupied: true,
        order_id: "ORD004",
        assigned_at: new Date(2025, 4, 5, 14, 0).toISOString(),
        due_date: new Date(2025, 4, 9, 17, 0).toISOString()
      },
      {
        id: "SLOT012",
        rack_id: "RACK002",
        position: "B2",
        occupied: true,
        order_id: "ORD005",
        assigned_at: new Date(2025, 4, 4, 9, 0).toISOString(),
        due_date: new Date(2025, 4, 7, 17, 0).toISOString()
      },
      {
        id: "SLOT013",
        rack_id: "RACK002",
        position: "B3",
        occupied: false
      },
      {
        id: "SLOT014",
        rack_id: "RACK002",
        position: "B4",
        occupied: false
      },
      {
        id: "SLOT015",
        rack_id: "RACK002",
        position: "B5",
        occupied: false
      },
      {
        id: "SLOT016",
        rack_id: "RACK002",
        position: "B6",
        occupied: false
      },
      {
        id: "SLOT017",
        rack_id: "RACK002",
        position: "B7",
        occupied: false
      },
      {
        id: "SLOT018",
        rack_id: "RACK002",
        position: "B8",
        occupied: false
      }
    ]
  }
];
