import { NavLink } from "react-router-dom";
import { Home, MessageSquare, ShoppingCart, BarChart3 } from "lucide-react";

const navs = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/orders", label: "Pesanan", icon: MessageSquare },
  { to: "/pos", label: "POS", icon: ShoppingCart },
  { to: "/reports", label: "Laporan", icon: BarChart3 },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-md flex justify-around items-center h-14 md:hidden">
      {navs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center text-xs font-semibold px-2 py-1 transition text-gray-500 ${isActive ? 'text-[#F76B3C]' : ''}`
          }
        >
          <Icon className="h-6 w-6 mb-0.5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
} 