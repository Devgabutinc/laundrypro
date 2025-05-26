import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

interface OwnerLayoutProps {
  children: ReactNode;
}

export function OwnerLayout({ children }: OwnerLayoutProps) {
  const { signOut, profile } = useAuth();
  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gray-50">
      {/* Header/Navbar Owner */}
      <header className="w-full max-w-screen-sm mx-auto flex items-center justify-between bg-white shadow px-4 py-3 rounded-b-lg sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-laundry-primary">Laundry<span className="text-laundry-accent">Pro</span></span>
          <span className="ml-3 text-base font-semibold text-gray-700">Panel Owner/Admin</span>
        </div>
        <button
          onClick={signOut}
          className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-4 py-1 rounded-lg text-sm border border-red-200"
        >
          Logout
        </button>
      </header>
      <main className="w-full max-w-screen-sm flex-1 flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-lg shadow p-4 my-8">
          {children}
        </div>
      </main>
    </div>
  );
} 