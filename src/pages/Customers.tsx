import { useEffect, useState, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Customer } from "@/models/Customer";
import { TenantContext } from "@/contexts/TenantContext";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFeature } from "@/hooks/useFeature";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Lock, Loader2 } from "lucide-react";

interface CustomerWithOrderCount extends Customer {
  orderCount: number;
  totalTransaction: number;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithOrderCount[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { businessId } = useAuth();
  const { tenant } = useContext(TenantContext);
  const [editCustomer, setEditCustomer] = useState<CustomerWithOrderCount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteCustomer, setDeleteCustomer] = useState<CustomerWithOrderCount | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { hasAccess: canExportData, loading: featureLoading } = useFeature("export_data");

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line
  }, [businessId]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Ambil semua customer untuk tenant ini
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (customerError) throw customerError;

      // Ambil semua order untuk tenant ini
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, customer_id, total_price")
        .eq("business_id", businessId);
      if (orderError) throw orderError;

      // Hitung jumlah order & total transaksi per customer
      const orderCountMap: Record<string, number> = {};
      const totalTransactionMap: Record<string, number> = {};
      (orderData || []).forEach((order) => {
        if (!order.customer_id) return;
        orderCountMap[order.customer_id] = (orderCountMap[order.customer_id] || 0) + 1;
        totalTransactionMap[order.customer_id] = (totalTransactionMap[order.customer_id] || 0) + (order.total_price || 0);
      });

      // Gabungkan data
      const result: CustomerWithOrderCount[] = (customerData || []).map((c: Customer) => ({
        ...c,
        orderCount: orderCountMap[c.id] || 0,
        totalTransaction: totalTransactionMap[c.id] || 0,
      }));
      setCustomers(result);
    } catch (error: any) {
      toast({ title: "Gagal memuat data pelanggan", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase())
  );

  // Fungsi export ke Excel
  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      // Data yang akan diekspor
      const exportData = customers.map(c => ({
        Nama: c.name,
        "No HP": c.phone || '-',
        Alamat: c.address || '-',
        "Tgl Daftar": c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '-',
        "Jumlah Order": c.orderCount,
        "Total Transaksi (Rp)": c.totalTransaction,
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pelanggan");
      
      // Cek apakah berjalan di Capacitor (Android/iOS)
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Import plugin Filesystem dari Capacitor
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const { Capacitor } = await import('@capacitor/core');
        const { Toast } = await import('@capacitor/toast');
        
        // Konversi workbook ke array buffer
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        
        // Konversi blob ke base64
        const reader = new FileReader();
        reader.onload = async function() {
          if (reader.result) {
            const base64Data = reader.result.toString().split(',')[1];
            const fileName = `data_pelanggan_${new Date().getTime()}.xlsx`;
            
            // Import Storage Access Framework utility
            const { exportFileWithSAF, getMimeType } = await import('@/utils/fileExportUtils');
            const mimeType = getMimeType(fileName); // Get appropriate MIME type
              
            // Gunakan Storage Access Framework untuk menyimpan file
            const result = await exportFileWithSAF(fileName, base64Data, mimeType);
              
            if (result.success) {
              console.log('File berhasil diexport:', result.uri);
              
              // Show success toast
              toast({
                title: "Berhasil",
                description: "Data pelanggan berhasil diexport",
              });
              
              // If there's a warning but still successful, show it
              if (result.error) {
                toast({
                  variant: "warning",
                  title: "Informasi",
                  description: result.error,
                });
              }
            } else {
              // Error handling
              console.error('Error menyimpan file:', result.error);
              toast({
                variant: "destructive",
                title: "Gagal",
                description: `Gagal export data: ${result.error}`,
              });
            }
          }
        };
        reader.readAsDataURL(blob);
      } else {
        // Browser biasa - gunakan metode download standar
        XLSX.writeFile(workbook, "data_pelanggan.xlsx");
      }
    } catch (error) {
      console.error('Error saat export data:', error);
      toast({
        title: "Error",
        description: "Gagal mengekspor data pelanggan",
        variant: "destructive"
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Fungsi update customer
  const handleUpdateCustomer = async (updated: Partial<CustomerWithOrderCount>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: updated.name,
          phone: updated.phone,
          address: updated.address,
        })
        .eq("id", updated.id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Data pelanggan diperbarui" });
      setShowEditModal(false);
      fetchCustomers();
    } catch (e: any) {
      toast({ title: "Gagal update", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi hapus customer
  const handleDeleteCustomer = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Berhasil", description: "Data pelanggan dihapus" });
      setShowDeleteModal(false);
      fetchCustomers();
    } catch (e: any) {
      toast({ title: "Gagal hapus", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Pelanggan</h1>
        {canExportData ? (
          <Button 
            onClick={exportToExcel} 
            variant="outline"
            disabled={exportLoading || customers.length === 0}
          >
            {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Excel
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  disabled
                  className="cursor-not-allowed opacity-70"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fitur ini hanya tersedia untuk pengguna premium</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Input
              placeholder="Cari nama, no HP, atau email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>No HP</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>Tgl Daftar</TableHead>
                <TableHead className="text-center">Jumlah Order</TableHead>
                <TableHead className="text-center">Total Transaksi (Rp)</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">Memuat data...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data pelanggan</TableCell>
                </TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{c.address || '-'}</TableCell>
                  <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '-'}</TableCell>
                  <TableCell className="text-center font-bold">{c.orderCount}</TableCell>
                  <TableCell className="text-center font-bold">Rp {c.totalTransaction.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <Button size="sm" variant="outline" className="mr-1" onClick={() => { setEditCustomer(c); setShowEditModal(true); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => { setDeleteCustomer(c); setShowDeleteModal(true); }}>Hapus</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* Modal Edit Customer */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Pelanggan</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleUpdateCustomer(editCustomer);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm mb-1">Nama</label>
                <Input
                  value={editCustomer.name}
                  onChange={e => setEditCustomer({ ...editCustomer, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">No HP</label>
                <Input
                  value={editCustomer.phone || ''}
                  onChange={e => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Alamat</label>
                <Input
                  value={editCustomer.address || ''}
                  onChange={e => setEditCustomer({ ...editCustomer, address: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Batal</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Modal Hapus Customer */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Data Pelanggan</DialogTitle>
          </DialogHeader>
          <div>Yakin ingin menghapus pelanggan <b>{deleteCustomer?.name}</b>?</div>
          <div className="flex gap-2 justify-end mt-4">
            <Button type="button" variant="outline" onClick={() => setShowDeleteModal(false)}>Batal</Button>
            <Button type="button" variant="destructive" disabled={saving} onClick={() => handleDeleteCustomer(deleteCustomer?.id!)}>{saving ? 'Menghapus...' : 'Hapus'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 