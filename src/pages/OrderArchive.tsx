import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatus, orderStatusLabels } from "@/models/Order";
import { useNavigate } from 'react-router-dom';
import { getShortOrderId } from "@/lib/utils";
import { Archive, Calendar, Clock, Download, Loader2, Search, Filter, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, isAfter, parseISO } from "date-fns";
import { id } from "date-fns/locale";
import { useFeature } from "@/hooks/useFeature";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the Archive Order interface
interface ArchiveOrder {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_price: number;
  created_at: string;
  updated_at: string;
  customerName?: string;
  customerPhone?: string;
  business_id: string;
}

function OrderArchive() {
  const [orders, setOrders] = useState<ArchiveOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ArchiveOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("3months");
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [exportLoading, setExportLoading] = useState(false);
  const { hasAccess: canExportData, loading: featureLoading } = useFeature("export_data");
  
  // Tanggal untuk filter
  const threeMonthsAgo = subMonths(new Date(), 3);
  const twoMonthsAgo = subMonths(new Date(), 2);
  const oneMonthAgo = subMonths(new Date(), 1);

  // Load archived orders from Supabase
  useEffect(() => {
    if (session && businessId) {
      fetchArchivedOrders();
    }
  }, [session, businessId]);

  // Filter orders when search query, status filter, or date filter changes
  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter, dateFilter]);

  const fetchArchivedOrders = async () => {
    try {
      setLoading(true);
      
      // Hanya ambil data maksimal 3 bulan ke belakang
      const threeMonthsAgoDate = threeMonthsAgo.toISOString();
      
      // Fetch only completed or cancelled orders from the last 3 months
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .in('status', ['completed', 'cancelled'])
        .gte('updated_at', threeMonthsAgoDate) // Hanya data 3 bulan terakhir
        .order('updated_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch customers to get names
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('business_id', businessId);
      
      if (customersError) throw customersError;
      
      // Map customers to orders
      const customerMap = new Map(customersData?.map(customer => [customer.id, customer]) || []);
      
      // Build complete orders with customer info
      const archivedOrders = ordersData?.map(order => {
        const customer = customerMap.get(order.customer_id);
        
        return {
          ...order,
          customerName: customer?.name || "Pelanggan Tidak Dikenal",
          customerPhone: customer?.phone || "",
          status: order.status as OrderStatus
        } as ArchiveOrder;
      }) || [];
      
      setOrders(archivedOrders);
      setFilteredOrders(archivedOrders);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan arsip",
        variant: "destructive"
      });
      console.error("Error fetching archived orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(query) ||
        getShortOrderId(order.id).toLowerCase().includes(query) ||
        (order.customerName && order.customerName.toLowerCase().includes(query))
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilter !== "all") {
      filtered = filtered.filter(order => {
        const orderDate = parseISO(order.updated_at);
        switch (dateFilter) {
          case "1month":
            return isAfter(orderDate, oneMonthAgo);
          case "2months":
            return isAfter(orderDate, twoMonthsAgo);
          case "3months":
          default:
            return isAfter(orderDate, threeMonthsAgo);
        }
      });
    }
    
    setFilteredOrders(filtered);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: id });
    } catch (error) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const exportToCSV = async () => {
    try {
      setExportLoading(true);
      
      // Create CSV content
      let csvContent = "ID Pesanan,Pelanggan,Status,Tanggal Dibuat,Tanggal Selesai,Total\n";
      
      filteredOrders.forEach(order => {
        const row = [
          getShortOrderId(order.id),
          order.customerName,
          orderStatusLabels[order.status],
          formatDate(order.created_at),
          formatDate(order.updated_at),
          order.total_price
        ].map(cell => `"${cell}"`).join(",");
        
        csvContent += row + "\n";
      });
      
      // Create blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `arsip_pesanan_${new Date().toISOString().slice(0, 10)}.csv`;
      
      // Cek apakah berjalan di Capacitor (Android/iOS)
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Import plugin Filesystem dari Capacitor
        const { Directory } = await import('@capacitor/filesystem');
        const { Toast } = await import('@capacitor/toast');
        const { exportFileWithSAF, getMimeType } = await import('@/utils/fileExportUtils');
        
        // Konversi blob ke base64
        const reader = new FileReader();
        reader.onload = async function() {
          if (reader.result) {
            const base64Data = reader.result.toString().split(',')[1];
            const mimeType = getMimeType(fileName); // Get appropriate MIME type
            
            // Gunakan Storage Access Framework untuk menyimpan file
            const result = await exportFileWithSAF(fileName, base64Data, mimeType);
            
            if (result.success) {
              console.log('File berhasil diexport:', result.uri);
              toast({
                title: "Berhasil",
                description: "Data arsip pesanan berhasil diexport",
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "Berhasil",
          description: "Data arsip pesanan berhasil diexport",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengexport data arsip pesanan",
        variant: "destructive"
      });
      console.error("Error exporting orders:", error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Archive className="mr-2 h-6 w-6" /> Arsip Pesanan
          </h1>
          <p className="text-muted-foreground text-xs">Catatan: Untuk efisiensi penyimpanan, data arsip pesanan akan otomatis dihapus setelah 3 bulan. Silakan unduh data yang diperlukan.</p>
        </div>
        {canExportData ? (
          <Button 
            onClick={exportToCSV} 
            variant="outline" 
            disabled={exportLoading || filteredOrders.length === 0}
          >
            {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
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
                  Export CSV
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
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari berdasarkan ID atau nama pelanggan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={dateFilter}
                onValueChange={setDateFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Tanggal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">1 Bulan Terakhir</SelectItem>
                  <SelectItem value="2months">2 Bulan Terakhir</SelectItem>
                  <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Tidak ada pesanan arsip</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" 
                  ? "Coba ubah filter pencarian Anda" 
                  : "Pesanan yang sudah selesai atau dibatalkan akan muncul di sini"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium py-2 px-2">ID</TableHead>
                    <TableHead className="text-xs font-medium py-2 px-2">Pelanggan</TableHead>
                    <TableHead className="text-xs font-medium py-2 px-2">Status</TableHead>
                    <TableHead className="text-xs font-medium py-2 px-2">Tanggal</TableHead>
                    <TableHead className="text-xs font-medium py-2 px-2 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <TableCell className="font-medium text-xs py-2 px-2">{getShortOrderId(order.id)}</TableCell>
                      <TableCell className="text-xs py-2 px-2">{order.customerName}</TableCell>
                      <TableCell className="py-2 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          order.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {orderStatusLabels[order.status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs py-2 px-2">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px]">Dibuat: {formatDate(order.created_at)}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px]">Selesai: {formatDate(order.updated_at)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium py-2 px-2">{formatCurrency(order.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderArchive;
