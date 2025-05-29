import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavLink, useLocation } from "react-router-dom";

interface SuperadminLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Dashboard", path: "/platform-admin" },
  { label: "Laporan & Banned", path: "/platform-admin/reports" },
  { label: "Batasan User", path: "/platform-admin/settings" },
  { label: "Tenant", path: "/platform-admin/tenants" },
  { label: "Users", path: "/platform-admin/users" },
  { label: "Tutorial", path: "/platform-admin/tutorials" },
  { label: "Paket Premium", path: "/admin/premium-plans" },
  { label: "Metode Pembayaran", path: "/admin/payment-methods" },
  { label: "Pesanan Upgrade Premium", path: "/platform-admin/premium-orders" },
  { label: "Notifikasi Developer", path: "/platform-admin/dev-notification" },
];

export function SuperadminLayout({ children }: SuperadminLayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-50">
      {/* Header/Navbar Superadmin */}
      <header className="w-full max-w-screen-md mx-auto flex items-center justify-between bg-white shadow px-4 py-3 rounded-b-lg sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-laundry-primary">Laundry<span className="text-laundry-accent">Pro</span></span>
          <span className="ml-3 text-base font-semibold text-gray-700">Platform Admin</span>
        </div>
        <button
          onClick={signOut}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-1 rounded-lg text-sm border border-red-200"
        >
          Logout
        </button>
      </header>
      {/* Navbar menu */}
      <nav className="w-full max-w-screen-md mx-auto flex gap-2 bg-white border-b px-4 py-2 sticky top-[56px] z-20">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `px-3 py-1 rounded font-semibold text-sm transition-colors ${isActive || location.pathname === item.path ? "bg-laundry-primary text-white" : "text-gray-700 hover:bg-gray-100"}`
            }
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main className="w-full max-w-screen-md flex-1 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-lg shadow p-4 my-8">
          {children}
        </div>
      </main>
    </div>
  );
} 