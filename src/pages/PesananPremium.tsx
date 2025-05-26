import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw, Download, Search, X } from "lucide-react";
import { id } from "date-fns/locale";

const PesananPremium = () => {
  const [premiumOrders, setPremiumOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // State untuk pencarian dan filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // State untuk modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // State untuk modal detail pembayaran
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  
  // State untuk modal tolak/hapus pesanan
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper: format tanggal
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  // Helper: hitung sisa hari
  const getSisaHari = (start: string, durasi: number) => {
    if (!start || !durasi) return '-';
    const mulai = new Date(start);
    const akhir = new Date(mulai);
    // Gunakan durasi dalam hari langsung
    const durasiHari = Number(durasi);
    // Tambahkan durasi dalam hari
    akhir.setDate(akhir.getDate() + durasiHari);
    const now = new Date();
    const diff = Math.ceil((akhir.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff + ' hari' : 'Expired';
  };

  const fetchPremiumOrders = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('premium_purchases')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && Array.isArray(data)) {
      setPremiumOrders(data);
      applyFilters(data);
    } else {
      setError(error?.message || 'Gagal load data');
    }
    setLoading(false);
  };
  
  // Fungsi untuk menerapkan filter pada data
  const applyFilters = (data: any[] = premiumOrders) => {
    let filtered = [...data];
    
    // Filter berdasarkan status
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Filter berdasarkan pencarian
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        (order.user_full_name?.toLowerCase().includes(term) || 
         order.business_name?.toLowerCase().includes(term) ||
         order.plan_name?.toLowerCase().includes(term))
      );
    }
    
    // Filter berdasarkan tanggal
    if (startDate) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate >= startDate;
      });
    }
    
    if (endDate) {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1); // Include the end date fully
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate < nextDay;
      });
    }
    
    setFilteredOrders(filtered);
  };
  
  // Reset semua filter
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
    applyFilters();
  };
  
  // Mendapatkan data untuk halaman saat ini
  const getCurrentPageData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredOrders.slice(startIndex, endIndex);
  };
  
  // Hitung total halaman
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Buka modal konfirmasi upgrade
  const openUpgradeConfirmation = (order: any) => {
    setSelectedOrder(order);
    setShowConfirmModal(true);
  };
  
  // Buka modal detail pembayaran
  const openPaymentDetails = (order: any) => {
    setSelectedPayment(order);
    setShowPaymentModal(true);
  };
  
  // Buka modal tolak/hapus pesanan
  const openRejectModal = (order: any) => {
    setSelectedOrder(order);
    setRejectReason("");
    setShowRejectModal(true);
  };
  
  // Tolak/hapus pesanan
  const handleRejectOrder = async () => {
    if (!selectedOrder) return;
    setIsDeleting(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      // Update status pesanan menjadi rejected atau hapus pesanan
      if (rejectReason.trim() === "") {
        setError("Alasan penolakan harus diisi");
        setIsDeleting(false);
        return;
      }
      
      const { error: err } = await supabase
        .from('premium_purchases')
        .update({ 
          status: 'rejected',
          reject_reason: rejectReason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);
        
      if (err) throw new Error(err.message);
      
      setSuccessMsg(`Pesanan dari ${selectedOrder.user_full_name} berhasil ditolak`);
      setShowRejectModal(false);
      fetchPremiumOrders();
    } catch (e: any) {
      setError(e.message || 'Gagal menolak pesanan');
    }
    
    setIsDeleting(false);
  };
  
  // Hapus pesanan premium
  const handleDeleteOrder = async (orderId: string, userName: string) => {
    if (!window.confirm(`Yakin ingin MENGHAPUS PERMANEN pesanan dari ${userName}?`)) return;
    
    setIsDeleting(true);
    setError(null);
    setSuccessMsg(null);
    
    try {
      const { error: err } = await supabase
        .from('premium_purchases')
        .delete()
        .eq('id', orderId);
        
      if (err) throw new Error(err.message);
      
      setSuccessMsg(`Pesanan dari ${userName} berhasil dihapus`);
      fetchPremiumOrders();
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus pesanan');
    }
    
    setIsDeleting(false);
  };
  
  // Approve pesanan premium
  const handleUpgradePremiumOrder = async () => {
    if (!selectedOrder) return;
    setProcessingId(selectedOrder.id);
    setShowConfirmModal(false);
    setError(null);
    setSuccessMsg(null);
    try {
      // Update status bisnis
      const now = new Date();
      const end = new Date(now);
      // Gunakan durasi dalam hari langsung
      const durasiHari = Number(selectedOrder.plan_duration_days);
      // Tambahkan durasi dalam hari
      end.setDate(end.getDate() + durasiHari);
      const { error: err1 } = await supabase
        .from('businesses')
        .update({
          status: 'premium',
          premium_start: now.toISOString(),
          premium_end: end.toISOString(),
        })
        .eq('id', selectedOrder.business_id);
      if (err1) throw new Error(err1.message);
      // Update status pesanan
      const { error: err2 } = await supabase
        .from('premium_purchases')
        .update({ status: 'approved' })
        .eq('id', selectedOrder.id);
      if (err2) throw new Error(err2.message);
      setSuccessMsg('Berhasil upgrade premium!');
      fetchPremiumOrders();
    } catch (e: any) {
      setError(e.message || 'Gagal upgrade premium');
    }
    setProcessingId(null);
  };

  // Efek untuk menerapkan filter saat ada perubahan
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, startDate, endDate]);
  
  // Efek untuk mengambil data saat komponen dimuat
  useEffect(() => {
    fetchPremiumOrders();
    
    // Auto refresh setiap 5 menit
    const intervalId = setInterval(() => {
      fetchPremiumOrders();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Export data ke CSV
  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    
    const headers = ["Nama User", "Nama Bisnis", "Paket", "Harga", "Durasi (hari)", "Tanggal Pesan", "Status"];
    const csvData = filteredOrders.map(order => [
      order.user_full_name,
      order.business_name,
      order.plan_name,
      order.harga,
      order.plan_duration_days,
      new Date(order.created_at).toLocaleDateString('id-ID'),
      order.status
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `pesanan-premium-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Hitung statistik
  const stats = {
    total: premiumOrders.length,
    pending: premiumOrders.filter(o => o.status !== 'approved' && o.status !== 'rejected').length,
    approved: premiumOrders.filter(o => o.status === 'approved').length,
    rejected: premiumOrders.filter(o => o.status === 'rejected').length,
    totalRevenue: premiumOrders
      .filter(o => o.status === 'approved')
      .reduce((sum, order) => sum + Number(order.harga || 0), 0)
  };
  
  return (
    <div className="space-y-8 max-w-screen-lg mx-auto px-2 py-8">
      <h1 className="text-2xl font-bold mb-4">Pesanan Upgrade Premium</h1>
      
      {/* Statistik Ringkas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Pesanan</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Ditolak</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Pendapatan</div>
          <div className="text-2xl font-bold text-blue-600">Rp {stats.totalRevenue.toLocaleString('id-ID')}</div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Daftar Pesanan Upgrade Premium</h2>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchPremiumOrders}
              title="Refresh Data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={exportToCSV}
              title="Export ke CSV"
              disabled={filteredOrders.length === 0}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Filter dan Pencarian */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative">
            <Input
              placeholder="Cari nama user atau bisnis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
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
            <SelectTrigger>
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'dd MMM yyyy', {locale: id}) : 'Tanggal Mulai'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'dd MMM yyyy', {locale: id}) : 'Tanggal Akhir'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Tombol Reset Filter */}
        {(searchTerm || statusFilter !== "all" || startDate || endDate) && (
          <div className="mb-4">
            <Button size="sm" variant="ghost" onClick={resetFilters}>
              Reset Filter
            </Button>
          </div>
        )}
        
        {error && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-2">{error}</div>}
        {successMsg && <div className="bg-green-100 text-green-700 px-3 py-2 rounded mb-2">{successMsg}</div>}
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama User</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama Bisnis</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Paket</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Harga</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Durasi (hari)</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Tanggal Pesan</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Sisa Hari</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-6">Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-4">Tidak ada pesanan premium yang sesuai filter.</td></tr>
              ) : getCurrentPageData().map(order => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{order.user_full_name}</td>
                  <td className="px-3 py-2">{order.business_name}</td>
                  <td className="px-3 py-2">{order.plan_name}</td>
                  <td className="px-3 py-2">Rp {Number(order.harga).toLocaleString('id-ID')}</td>
                  <td className="px-3 py-2">{order.plan_duration_days} hari</td>
                  <td className="px-3 py-2">
                    <button 
                      onClick={() => openPaymentDetails(order)} 
                      className="text-blue-600 hover:underline"
                    >
                      {formatDate(order.created_at)}
                    </button>
                  </td>
                  <td className="px-3 py-2">{getSisaHari(order.created_at, order.plan_duration_days)}</td>
                  <td className="px-3 py-2">
                    {order.status === 'approved' ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">Approved</span>
                    ) : order.status === 'rejected' ? (
                      <div>
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">Ditolak</span>
                        {order.reject_reason && (
                          <div className="text-xs text-gray-500 mt-1 italic truncate max-w-[150px]" title={order.reject_reason}>
                            "{order.reject_reason}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">Pending</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {order.status === 'approved' ? (
                      <button className="bg-gray-200 text-gray-500 px-3 py-1 rounded text-xs font-bold cursor-not-allowed" disabled>
                        Sudah Upgrade
                      </button>
                    ) : order.status === 'rejected' ? (
                      <div className="flex flex-col space-y-1">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold">
                          Ditolak
                        </span>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold"
                          onClick={() => handleDeleteOrder(order.id, order.user_full_name)}
                          disabled={isDeleting}
                        >
                          Hapus Permanen
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-1">
                        <button
                          className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold ${processingId === order.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                          onClick={() => openUpgradeConfirmation(order)}
                          disabled={processingId === order.id || isDeleting}
                        >
                          {processingId === order.id ? 'Memproses...' : 'Upgrade Premium'}
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold"
                          onClick={() => openRejectModal(order)}
                          disabled={processingId === order.id || isDeleting}
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
              Menampilkan {Math.min(filteredOrders.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredOrders.length, currentPage * itemsPerPage)} dari {filteredOrders.length} pesanan
            </div>
            <div className="flex space-x-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
              >
                &laquo;
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
              >
                &lsaquo;
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Tampilkan 5 halaman dengan halaman saat ini di tengah jika memungkinkan
                let pageToShow;
                if (totalPages <= 5) {
                  pageToShow = i + 1;
                } else if (currentPage <= 3) {
                  pageToShow = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageToShow = totalPages - 4 + i;
                } else {
                  pageToShow = currentPage - 2 + i;
                }
                
                return (
                  <Button 
                    key={pageToShow}
                    size="sm" 
                    variant={currentPage === pageToShow ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageToShow)}
                  >
                    {pageToShow}
                  </Button>
                );
              })}
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages}
              >
                &rsaquo;
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
              >
                &raquo;
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal Konfirmasi Upgrade */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Upgrade Premium</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Nama User</div>
                  <div className="font-medium">{selectedOrder.user_full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Nama Bisnis</div>
                  <div className="font-medium">{selectedOrder.business_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Paket</div>
                  <div className="font-medium">{selectedOrder.plan_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Durasi</div>
                  <div className="font-medium">{selectedOrder.plan_duration_days} hari</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Harga</div>
                  <div className="font-medium">Rp {Number(selectedOrder.harga).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tanggal Pesan</div>
                  <div className="font-medium">{formatDate(selectedOrder.created_at)}</div>
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-md text-sm">
                <p className="font-medium text-yellow-800">Peringatan:</p>
                <p className="text-yellow-700">Tindakan ini akan mengaktifkan status premium untuk bisnis ini selama {selectedOrder.plan_duration_days} hari.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Batal</Button>
            <Button onClick={handleUpgradePremiumOrder}>Konfirmasi Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Tolak Pesanan */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pesanan Premium</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="py-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Nama User</div>
                <div className="font-medium">{selectedOrder.user_full_name}</div>
              </div>
              <div className="mb-4">
                <div className="text-sm text-gray-500 mb-1">Alasan Penolakan</div>
                <textarea 
                  className="w-full border rounded-md p-2 text-sm"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan pesanan ini..."
                />
              </div>
              <div className="bg-yellow-50 p-3 rounded-md text-sm mb-4">
                <p className="font-medium text-yellow-800">Peringatan:</p>
                <p className="text-yellow-700">Pesanan yang ditolak masih akan tersimpan dalam sistem dengan status 'Ditolak'. Jika ingin menghapus permanen, gunakan tombol 'Hapus Permanen' setelah pesanan ditolak.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectOrder}
              disabled={isDeleting || rejectReason.trim() === ""}
            >
              {isDeleting ? "Memproses..." : "Tolak Pesanan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal Detail Pembayaran */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Nama Pengirim</div>
                  <div className="font-medium">{selectedPayment.nama_pengirim || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Bank Pengirim</div>
                  <div className="font-medium">{selectedPayment.bank_pengirim || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Jumlah Transfer</div>
                  <div className="font-medium">Rp {Number(selectedPayment.jumlah_transfer || selectedPayment.harga).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Tanggal Pembayaran</div>
                  <div className="font-medium">{formatDate(selectedPayment.created_at)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Bukti Transfer</div>
                  {selectedPayment.bukti_transfer ? (
                    <a 
                      href={selectedPayment.bukti_transfer} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Lihat Bukti Transfer
                    </a>
                  ) : (
                    <div className="text-gray-500">Tidak ada bukti transfer</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PesananPremium; 