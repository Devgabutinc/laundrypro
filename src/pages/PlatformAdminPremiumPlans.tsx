import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { RefreshCw, Search, X, Plus, Edit, Trash, Download } from "lucide-react";
import { toast } from "sonner";

type PremiumPlan = Database['public']['Tables']['premium_plans']['Row'];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "coming_soon", label: "Coming Soon" },
];

export default function PlatformAdminPremiumPlans(): React.ReactNode {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<PremiumPlan | null>(null);
  const [form, setForm] = useState<Partial<PremiumPlan>>({ features: [] });
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { profile } = useAuth();

  // Efek untuk menerapkan filter saat ada perubahan
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter]);
  
  // Efek untuk mengambil data saat komponen dimuat
  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data, error } = await supabase
      .from("premium_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      setPlans(data as PremiumPlan[]);
      applyFilters(data as PremiumPlan[]);
    } else if (error) {
      toast.error("Gagal mengambil data paket premium");
    }
    setLoading(false);
  }
  
  // Fungsi untuk menerapkan filter
  function applyFilters(data: PremiumPlan[] = plans) {
    let filtered = [...data];
    
    // Filter berdasarkan status
    if (statusFilter !== "all") {
      filtered = filtered.filter(plan => plan.status === statusFilter);
    }
    
    // Filter berdasarkan pencarian
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plan => 
        plan.name?.toLowerCase().includes(term) || 
        plan.description?.toLowerCase().includes(term) ||
        plan.features?.some(feature => feature.toLowerCase().includes(term))
      );
    }
    
    setFilteredPlans(filtered);
  }
  
  // Reset filter
  function resetFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    applyFilters();
  }

  function openAdd() {
    setEditPlan(null);
    setForm({ 
      features: [],
      status: "active",
      duration_days: 30, // Default 30 hari
      price: 0
    });
    setShowForm(true);
  }
  
  function openEdit(plan: PremiumPlan) {
    setEditPlan(plan);
    setForm({ ...plan, features: plan.features || [] });
    setShowForm(true);
  }
  
  function closeForm() {
    setShowForm(false);
    setEditPlan(null);
    setForm({ features: [] });
  }
  
  function openDeleteConfirm(id: string) {
    setPlanToDelete(id);
    setShowDeleteDialog(true);
  }

  async function handleSave() {
    // Validasi form
    if (!form.name || form.name.trim() === "") {
      toast.error("Nama paket harus diisi");
      return;
    }
    
    if (Number(form.duration_days) <= 0) {
      toast.error("Durasi harus lebih dari 0 hari");
      return;
    }
    
    setSaving(true);
    const payload = {
      name: form.name || '',
      price: Number(form.price) || 0,
      duration_days: Number(form.duration_days) || 0,
      duration_month: 0, // Keep field but set to 0 since we're only using days now
      description: form.description || '',
      features: (form.features || []).filter(f => f.trim() !== ""),
      status: form.status || 'active',
      is_active: form.is_active ?? true,
      created_at: form.created_at || new Date().toISOString(),
    };
    
    try {
      if (editPlan) {
        const { error } = await supabase
          .from("premium_plans")
          .update(payload)
          .eq("id", editPlan.id);
          
        if (error) throw error;
        toast.success("Paket berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("premium_plans")
          .insert([payload]);
          
        if (error) throw error;
        toast.success("Paket baru berhasil ditambahkan");
      }
      
      await fetchPlans();
      closeForm();
    } catch (error: any) {
      toast.error(`Gagal menyimpan: ${error.message || 'Terjadi kesalahan'}`); 
    }
    
    setSaving(false);
  }

  async function handleDelete() {
    if (!planToDelete) return;
    
    try {
      const { error } = await supabase
        .from("premium_plans")
        .delete()
        .eq("id", planToDelete);
        
      if (error) throw error;
      
      toast.success("Paket berhasil dihapus");
      await fetchPlans();
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message || 'Terjadi kesalahan'}`);
    }
    
    setShowDeleteDialog(false);
    setPlanToDelete(null);
  }

  function handleFeatureChange(idx: number, value: string) {
    const features = Array.isArray(form.features) ? [...form.features] : [];
    features[idx] = value;
    setForm({ ...form, features });
  }
  function addFeature() {
    setForm({ ...form, features: Array.isArray(form.features) ? [...form.features, ""] : [""] });
  }
  function removeFeature(idx: number) {
    const features = [...(form.features || [])];
    features.splice(idx, 1);
    setForm({ ...form, features });
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const { error } = await supabase
        .from("premium_plans")
        .update({ status })
        .eq("id", id);
        
      if (error) throw error;
      
      toast.success(`Status paket berhasil diubah menjadi ${status}`);
      await fetchPlans();
    } catch (error: any) {
      toast.error(`Gagal mengubah status: ${error.message || 'Terjadi kesalahan'}`);
    }
  }
  
  // Export data ke CSV
  function exportToCSV() {
    if (filteredPlans.length === 0) return;
    
    const headers = ["Nama", "Harga", "Durasi (hari)", "Status", "Deskripsi", "Fitur"];
    const csvData = filteredPlans.map(plan => [
      plan.name,
      plan.price,
      plan.duration_days || 0,
      plan.status,
      plan.description,
      (plan.features || []).join("; ")
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `paket-premium-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Hitung statistik
  const stats = {
    total: plans.length,
    active: plans.filter(p => p.status === 'active').length,
    inactive: plans.filter(p => p.status === 'inactive').length,
    comingSoon: plans.filter(p => p.status === 'coming_soon').length,
  };
  
  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manajemen Paket Premium</h1>
      
      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Paket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tidak Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Coming Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.comingSoon}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Form tambah/edit di atas tabel */}
      {showForm && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h2 className="font-bold text-lg mb-2">{editPlan ? "Edit Paket" : "Tambah Paket"}</h2>
          <div className="space-y-2">
            <Input placeholder="Nama Paket" value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Harga" type="number" value={form.price ?? ""} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
            <Input placeholder="Durasi (hari)" type="number" value={form.duration_days ?? ""} onChange={e => setForm({ ...form, duration_days: Number(e.target.value) })} />
            <Textarea placeholder="Deskripsi" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
            <label className="block text-xs font-semibold mb-1">Status</label>
            <select
              className="w-full border rounded px-2 py-2 text-sm mb-2"
              value={form.status || "active"}
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div>
              <div className="font-semibold text-xs mb-1">Fitur/Spesifikasi</div>
              {(form.features || []).map((f, idx) => (
                <div key={idx} className="flex gap-2 mb-1">
                  <Input value={f} onChange={e => handleFeatureChange(idx, e.target.value)} className="flex-1" />
                  <Button size="sm" variant="destructive" onClick={() => removeFeature(idx)}>-</Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addFeature}>Tambah Fitur</Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeForm}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>{editPlan ? "Simpan" : "Tambah"}</Button>
          </div>
        </div>
      )}
      {!showForm && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <Button onClick={openAdd} className="flex items-center gap-1">
                <Plus className="h-4 w-4" /> Tambah Paket
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchPlans}
                title="Refresh Data"
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={exportToCSV}
                title="Export ke CSV"
                disabled={filteredPlans.length === 0}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Input
                  placeholder="Cari paket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2.5"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Tidak Aktif</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Tombol Reset Filter */}
          {(searchTerm || statusFilter !== "all") && (
            <div className="mb-4">
              <Button size="sm" variant="ghost" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-8">Memuat data paket premium...</div>
          ) : filteredPlans.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {plans.length === 0 ? "Belum ada paket premium." : "Tidak ada paket yang sesuai dengan filter."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <thead>
                  <tr>
                    <th className="w-1/4">Nama</th>
                    <th className="w-1/6">Harga</th>
                    <th className="w-1/6">Durasi (hari)</th>
                    <th className="w-1/6">Status</th>
                    <th className="w-1/4">Fitur</th>
                    <th className="w-1/6">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(plan => (
                    <tr key={plan.id}>
                      <td className="font-medium">{plan.name}</td>
                      <td>Rp {Number(plan.price).toLocaleString("id-ID")}</td>
                      <td>{Number(plan.duration_days || 0)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span 
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${plan.status === 'active' ? 'bg-green-100 text-green-800' : 
                              plan.status === 'coming_soon' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'}`}
                          >
                            {plan.status === 'active' ? 'Aktif' : 
                             plan.status === 'coming_soon' ? 'Coming Soon' : 'Tidak Aktif'}
                          </span>
                          {profile?.role === 'superadmin' && (
                            <Select 
                              defaultValue={plan.status} 
                              onValueChange={(value) => handleStatusChange(plan.id, value)}
                            >
                              <SelectTrigger className="h-7 w-7 p-0 border-none">
                                <Edit className="h-3.5 w-3.5 text-gray-500" />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </td>
                      <td>
                        <ul className="list-disc pl-4 text-xs max-h-20 overflow-y-auto">
                          {plan.features?.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openEdit(plan)}
                            className="flex items-center gap-1 h-8"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => openDeleteConfirm(plan.id)}
                            className="flex items-center gap-1 h-8"
                          >
                            <Trash className="h-3.5 w-3.5" /> Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </>
      )}
      
      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Paket Premium</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">Apakah Anda yakin ingin menghapus paket premium ini?</p>
            <p className="text-red-600 text-sm mt-2">Perhatian: Tindakan ini tidak dapat dibatalkan dan semua data terkait paket ini akan dihapus.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus Permanen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
