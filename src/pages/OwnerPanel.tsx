import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Definisikan tipe UserProfile sesuai field Supabase
interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  is_active: boolean | null;
}

const OwnerPanel = () => {
  const { businessId, profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!businessId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, is_active")
        .eq("business_id", businessId);
      if (error) setError(error.message);
      setUsers(((data as unknown) as UserProfile[]) || []);
      setLoading(false);
    };
    fetchUsers();
  }, [businessId]);

  return (
    <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full py-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Panel Owner/Admin</h1>
        <p className="text-muted-foreground mb-4">
          Kelola user, role, dan akses premium di tenant Anda.
        </p>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Daftar User</h2>
        {loading ? (
          <p className="text-gray-500">Memuat data user...</p>
        ) : error ? (
          <p className="text-red-500">Gagal memuat user: {error}</p>
        ) : users.length === 0 ? (
          <p className="text-gray-500">Belum ada user terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Role</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-800">{`${user.first_name || ""} ${user.last_name || ""}`.trim() || '-'}</td>
                    <td className="px-3 py-2 text-gray-700">{user.role || '-'}</td>
                    <td className="px-3 py-2">
                      {user.is_active === false ? (
                        <span className="text-red-500 font-semibold">Suspended</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Aktif</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerPanel; 