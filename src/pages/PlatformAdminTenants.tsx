import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Tenant {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  status?: string;
  premium_start?: string | null;
  premium_end?: string | null;
  premium_days_left?: number | null;
}

const PlatformAdminTenants = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [premiumActionLoading, setPremiumActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<keyof Tenant>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data: tenantData, error: tenantError } = await supabase
      .from("businesses")
      .select("id, name, address, phone, status, premium_start, premium_end, premium_days_left");
    if (tenantError) setError(tenantError.message);
    const now = new Date();
    const updatedTenants = (tenantData as Tenant[]).map(t => {
      if (t.status === 'premium' && t.premium_end && new Date(t.premium_end) < now) {
        updateTenantStatusToFree(t.id);
        return { ...t, status: 'free' };
      }
      if (!t.status) return { ...t, status: 'free' };
      return t;
    });
    setTenants(updatedTenants || []);
    setLoading(false);
  };

  const updateTenantStatusToFree = async (tenantId: string) => {
    await supabase
      .from("businesses")
      .update({ status: "free" })
      .eq("id", tenantId);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) + 
           ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Handler batalkan premium (dengan menyimpan sisa hari)
  const batalkanPremium = async (tenant: Tenant) => {
    if (!window.confirm('Yakin ingin membatalkan premium? Sisa hari akan disimpan.')) return;
    setPremiumActionLoading(tenant.id);
    let daysLeft = 0;
    if (tenant.premium_end) {
      const now = new Date();
      const end = new Date(tenant.premium_end);
      
      // Calculate days left with millisecond precision to match Dashboard calculation
      const diffTime = end.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      // Log for debugging
      console.log(`Premium end: ${end.toISOString()}, Now: ${now.toISOString()}, Diff days: ${daysLeft}`);
    }
    await supabase
      .from('businesses')
      .update({
        status: 'free',
        premium_start: null,
        premium_end: null,
        premium_days_left: daysLeft
      })
      .eq('id', tenant.id);
    setPremiumActionLoading(null);
    fetchData();
  };
  
  // Handler hapus premium (tanpa menyimpan sisa hari)
  const hapusPremium = async (tenant: Tenant) => {
    if (!window.confirm('Yakin ingin menghapus status premium sepenuhnya? Sisa hari TIDAK akan disimpan.')) return;
    setPremiumActionLoading(tenant.id);
    await supabase
      .from('businesses')
      .update({
        status: 'free',
        premium_start: null,
        premium_end: null,
        premium_days_left: 0 // Set to 0 to completely remove premium
      })
      .eq('id', tenant.id);
    setPremiumActionLoading(null);
    fetchData();
  };

  // Handler lanjutkan premium
  const lanjutkanPremium = async (tenant: Tenant) => {
    if (!window.confirm('Lanjutkan premium dari sisa hari sebelumnya?')) return;
    setPremiumActionLoading(tenant.id);
    
    // Get current date and time with full precision
    const now = new Date();
    
    // Calculate end date by adding the exact number of days
    const days = tenant.premium_days_left || 0;
    const endTime = now.getTime() + (days * 24 * 60 * 60 * 1000);
    const end = new Date(endTime);
    
    console.log(`Continuing premium for ${days} days, from ${now.toISOString()} to ${end.toISOString()}`);
    
    await supabase
      .from('businesses')
      .update({
        status: 'premium',
        premium_start: now.toISOString(),
        premium_end: end.toISOString(),
        premium_days_left: null
      })
      .eq('id', tenant.id);
    setPremiumActionLoading(null);
    fetchData();
  };

  // Filter & sort
  const filtered = tenants.filter(t => {
    const matchName = t.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : t.status === statusFilter;
    return matchName && matchStatus;
  });
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const handleSort = (col: keyof Tenant) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-8 max-w-screen-md mx-auto px-2 py-8">
      <h1 className="text-2xl font-bold mb-4">Daftar Tenant</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center">
        <input
          className="border rounded px-3 py-2 text-sm w-full sm:w-64"
          placeholder="Cari nama bisnis..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2 text-sm w-full sm:w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">Semua Status</option>
          <option value="premium">Premium</option>
          <option value="free">Free</option>
        </select>
      </div>
      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat data tenant...</div>
      ) : error ? (
        <div className="text-red-500 mb-2">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>
                  Nama Bisnis {sortBy === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer" onClick={() => handleSort('address')}>
                  Alamat {sortBy === 'address' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer" onClick={() => handleSort('phone')}>
                  No. HP {sortBy === 'phone' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer" onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Tanggal Premium</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 cursor-pointer" onClick={() => handleSort('premium_days_left')}>
                  Sisa Hari {sortBy === 'premium_days_left' && (sortDir === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tenant) => (
                <tr key={tenant.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium text-gray-800">{tenant.name}</td>
                  <td className="px-3 py-2">{tenant.address || '-'}</td>
                  <td className="px-3 py-2">{tenant.phone || '-'}</td>
                  <td className="px-3 py-2">
                    {tenant.status === 'premium' ? (
                      <span className="text-green-700 font-semibold">Premium</span>
                    ) : (
                      <span className="text-gray-500 font-semibold">Free</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {tenant.status === 'premium' && tenant.premium_start && tenant.premium_end ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Mulai:</span> {formatDate(tenant.premium_start)}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Berakhir:</span> {formatDate(tenant.premium_end)}
                        </div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {tenant.status === 'free' && tenant.premium_days_left > 0 ? (
                      <span className="text-yellow-600 font-semibold">{tenant.premium_days_left} hari</span>
                    ) : tenant.status === 'premium' && tenant.premium_end ? (
                      (() => {
                        const now = new Date();
                        const end = new Date(tenant.premium_end);
                        const diffTime = end.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return (
                          <span className="text-green-600 font-semibold">{diffDays} hari</span>
                        );
                      })()
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {tenant.status === 'premium' && (
                      <div className="flex flex-col space-y-1">
                        <button
                          className={`bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold border border-red-200 ${premiumActionLoading === tenant.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => batalkanPremium(tenant)}
                          disabled={premiumActionLoading === tenant.id}
                        >
                          {premiumActionLoading === tenant.id ? 'Memproses...' : 'Batalkan (Simpan Sisa)'}
                        </button>
                        <button
                          className={`bg-red-200 text-red-800 px-2 py-1 rounded text-xs font-semibold border border-red-300 ${premiumActionLoading === tenant.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => hapusPremium(tenant)}
                          disabled={premiumActionLoading === tenant.id}
                        >
                          {premiumActionLoading === tenant.id ? 'Memproses...' : 'Hapus Premium'}
                        </button>
                      </div>
                    )}
                    {tenant.status === 'free' && tenant.premium_days_left > 0 && (
                      <div className="flex flex-col space-y-1">
                        <button
                          className={`bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold border border-green-200 ${premiumActionLoading === tenant.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => lanjutkanPremium(tenant)}
                          disabled={premiumActionLoading === tenant.id}
                        >
                          {premiumActionLoading === tenant.id ? 'Memproses...' : 'Lanjutkan Premium'}
                        </button>
                        <button
                          className={`bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold border border-red-200 ${premiumActionLoading === tenant.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => hapusPremium(tenant)}
                          disabled={premiumActionLoading === tenant.id}
                        >
                          {premiumActionLoading === tenant.id ? 'Memproses...' : 'Hapus Sisa Hari'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada tenant ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlatformAdminTenants; 