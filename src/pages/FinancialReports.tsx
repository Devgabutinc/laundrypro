import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, ArrowUpDown } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Transaction } from "@/models/Transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TenantContext } from "@/contexts/TenantContext";
import * as XLSX from "xlsx";
import { getShortOrderId } from "@/lib/utils";
import * as React from 'react';
import { DateRange } from 'react-day-picker';
import { useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale/id';

// Helper sederhana untuk cek akses fitur
function canAccessFeature(featureName: string, tenantStatus: string, featureSettings: any[]): boolean {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

// Fungsi utilitas untuk ekspor ke CSV
async function exportToCSV(transactions: Transaction[], fileName: string) {
  if (!transactions.length) return;
  
  try {
    const header = [
      'ID', 'Tanggal', 'Jenis', 'Deskripsi', 'Kategori', 'Jumlah', 'Metode Pembayaran', 'Status'
    ];
    const rows = transactions.map(tx => [
      getShortOrderId(tx.id),
      new Date(tx.date).toLocaleDateString('id-ID'),
      tx.type === 'income' ? 'Pendapatan' : 'Pengeluaran',
      tx.description || '',
      tx.category || '',
      tx.amount,
      tx.payment_method || '',
      tx.status
    ]);
    const csvContent = [header, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Cek apakah berjalan di Capacitor (Android/iOS)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // Import plugin Toast dari Capacitor
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
            await Toast.show({
              text: "Laporan keuangan berhasil diexport",
              duration: 'long'
            });
            
            // If there's a warning but still successful, show it
            if (result.error) {
              await Toast.show({
                text: result.error,
                duration: 'long'
              });
            }
          } else {
            // Error handling
            console.error('Error menyimpan file:', result.error);
            await Toast.show({
              text: `Gagal export data: ${result.error}`,
              duration: 'long'
            });
          }
        }
      };
      reader.readAsDataURL(blob);
    } else {
      // Browser biasa - gunakan metode download standar
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({
        text: "Gagal mengekspor data. Silakan coba lagi.",
        duration: 'long'
      });
    } else {
      alert("Gagal mengekspor data. Silakan coba lagi.");
    }
  }
}

// Fungsi utilitas untuk ekspor ke XLSX (Excel) - 1 sheet, styling rapi
async function exportToXLSX(transactions: Transaction[], saldoPerMetode: Record<string, number>, fileName: string) {
  if (!transactions.length) return;
  
  try {
    // Hitung ringkasan
    const totalIncome = transactions.filter(tx => tx.type === "income" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount, 0);
    const totalExpense = transactions.filter(tx => tx.type === "expense" && tx.status === "completed").reduce((sum, tx) => sum + tx.amount, 0);
    const netProfit = totalIncome - totalExpense;
    
    // Data untuk sheet detail
    const detailSheetData = [
      ["ID", "Tanggal", "Jenis", "Deskripsi", "Kategori", "Jumlah", "Metode Pembayaran", "Status"],
      ...transactions.map(tx => [
        getShortOrderId(tx.id),
        new Date(tx.date).toLocaleDateString("id-ID"),
        tx.type === "income" ? "Pendapatan" : "Pengeluaran",
        tx.description || "",
        tx.category || "",
        tx.amount,
        tx.payment_method || "",
        tx.status
      ])
    ];
    
    // Data untuk sheet summary bulanan
    const monthlySummary = getMonthlySummary(transactions);
    const summarySheetData = [
      ["Bulan", "Pendapatan", "Pengeluaran", "Profit"],
      ...monthlySummary.map(([ym, sum]) => {
        const [year, month] = ym.split('-');
        const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        return [
          monthName,
          sum.income,
          sum.expense,
          sum.profit
        ];
      })
    ];
    
    // Buat worksheet
    const wsDetail = XLSX.utils.aoa_to_sheet(detailSheetData);
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
    
    // Buat workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Bulanan");
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Transaksi");
    
    // Cek apakah berjalan di Capacitor (Android/iOS)
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // Import Storage Access Framework utility
      const { Toast } = await import('@capacitor/toast');
      const { exportFileWithSAF, getMimeType } = await import('@/utils/fileExportUtils');
      
      // Konversi workbook ke array buffer
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
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
            await Toast.show({
              text: "Laporan keuangan berhasil diexport",
              duration: 'long'
            });
            
            // If there's a warning but still successful, show it
            if (result.error) {
              await Toast.show({
                text: result.error,
                duration: 'long'
              });
            }
          } else {
            // Error handling
            console.error('Error menyimpan file:', result.error);
            await Toast.show({
              text: `Gagal export data: ${result.error}`,
              duration: 'long'
            });
          }
        }
      };
      reader.readAsDataURL(blob);
    } else {
      // Browser biasa - gunakan metode download standar
      XLSX.writeFile(wb, fileName);
    }
  } catch (error) {
    console.error("Error exporting to XLSX:", error);
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({
        text: "Gagal mengekspor data. Silakan coba lagi.",
        duration: 'long'
      });
    } else {
      alert("Gagal mengekspor data. Silakan coba lagi.");
    }
  }
}

// Tambahkan fungsi untuk rekap bulanan
function getMonthlySummary(transactions: Transaction[]) {
  // Group by year-month
  const summary: Record<string, { income: number; expense: number; profit: number }> = {};
  transactions.forEach(tx => {
    const d = new Date(tx.date);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!summary[ym]) summary[ym] = { income: 0, expense: 0, profit: 0 };
    if (tx.type === 'income' && tx.status === 'completed') summary[ym].income += tx.amount;
    if (tx.type === 'expense' && tx.status === 'completed') summary[ym].expense += tx.amount;
    summary[ym].profit = summary[ym].income - summary[ym].expense;
  });
  // Sort by month desc
  const sorted = Object.entries(summary).sort((a, b) => b[0].localeCompare(a[0]));
  return sorted;
}

// Helper untuk data grafik tren bulanan
function getMonthlyTrendData(monthlySummary: [string, { income: number; expense: number; profit: number }][]) {
  // Urutkan ascending (lama ke baru)
  return monthlySummary.slice().reverse().map(([ym, sum]) => {
    const [year, month] = ym.split('-');
    const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'short', year: '2-digit' });
    return {
      month: monthName,
      income: sum.income,
      expense: sum.expense,
      profit: sum.profit
    };
  });
}

const FinancialReports = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>("this-month");
  const [reportType, setReportType] = useState<string>("summary");
  const [sortField, setSortField] = useState<keyof Transaction>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseMethod, setExpenseMethod] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";

  // State untuk feature settings
  const [featureSettings, setFeatureSettings] = useState<any[]>([]);
  const [featureLoading, setFeatureLoading] = useState(true);

  // Tambahkan filter periode custom (date range picker) yang mobile friendly
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [showCalendar, setShowCalendar] = useState(false);

  // Fetch feature_settings dari Supabase
  useEffect(() => {
    const fetchFeatureSettings = async () => {
      setFeatureLoading(true);
      const { data, error } = await supabase
        .from("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) setFeatureSettings(data);
      setFeatureLoading(false);
    };
    fetchFeatureSettings();
  }, []);

  // Cek akses fitur dinamis
  const allowed = canAccessFeature("financial_reports", tenantStatus, featureSettings);
  // Tombol ekspor aktif jika fitur diaktifkan untuk status tenant saat ini (free/premium)
  const canExport = canAccessFeature("financial_reports", tenantStatus, featureSettings);

  // Load transactions from Supabase
  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    fetchTransactions();
  }, [businessId]);

  const fetchTransactions = async () => {
    if (!businessId) {
      setTransactions([]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('date', { ascending: false });
      if (error) throw error;
      setTransactions(data as Transaction[] || []);
    } catch (error: any) {
      toast({
        title: "Gagal mengambil data transaksi",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions based on time period
  const getFilteredTransactions = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let filtered: Transaction[];
    
    if (timeFilter === 'custom' && customRange?.from && customRange?.to) {
      filtered = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= customRange.from! && d <= customRange.to!;
      });
    } else {
      switch (timeFilter) {
        case "today":
          filtered = transactions.filter(tx => new Date(tx.date) >= startOfDay);
          break;
        case "this-week":
          filtered = transactions.filter(tx => new Date(tx.date) >= startOfWeek);
          break;
        case "this-month":
        default:
          filtered = transactions.filter(tx => new Date(tx.date) >= startOfMonth);
          break;
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const filteredTransactions = getFilteredTransactions();
  const monthlySummary = getMonthlySummary(filteredTransactions);
  const monthlyTrendData = getMonthlyTrendData(monthlySummary);
  
  // Calculate summary data
  const totalIncome = filteredTransactions
    .filter(tx => tx.type === "income" && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const totalExpense = filteredTransactions
    .filter(tx => tx.type === "expense" && tx.status === "completed")
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const netProfit = totalIncome - totalExpense;

  // Prepare data for charts
  const incomeVsExpenseData = [
    { name: "Pendapatan", value: totalIncome },
    { name: "Pengeluaran", value: totalExpense }
  ];
  
  const categoryData = filteredTransactions
    .filter(tx => tx.status === "completed")
    .reduce((acc, tx) => {
      const existingCategory = acc.find(item => item.name === tx.category);
      if (existingCategory) {
        existingCategory.value += tx.amount;
      } else {
        acc.push({ name: tx.category, value: tx.amount });
      }
      return acc;
    }, [] as { name: string, value: number }[]);

  // Format currency
  const formatCurrency = (value: number) => {
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  // Handle sorting
  const toggleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    if (!expenseAmount || !expenseCategory || !expenseDate || !expenseMethod) {
      setExpenseError("Semua field wajib diisi!");
      return;
    }
    setExpenseLoading(true);
    try {
      const { error } = await supabase.from("transactions").insert({
        type: "expense",
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        description: expenseDescription,
        date: new Date(expenseDate).toISOString(),
        payment_method: expenseMethod,
        status: "completed",
        business_id: businessId,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setShowExpenseModal(false);
      setExpenseAmount("");
      setExpenseCategory("");
      setExpenseDescription("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setExpenseMethod("");
      fetchTransactions();
      toast({ title: "Pengeluaran berhasil ditambahkan!" });
    } catch (err: any) {
      setExpenseError(err.message || "Gagal menambah pengeluaran");
    } finally {
      setExpenseLoading(false);
    }
  };

  // Hitung saldo per metode pembayaran
  const paymentMethods = [
    { key: "cash", label: "Tunai" },
    { key: "transfer", label: "Bank" },
    { key: "qris", label: "QRIS" },
  ];

  const saldoPerMetode: Record<string, number> = {};
  paymentMethods.forEach(({ key }) => {
    const pemasukan = filteredTransactions.filter(tx => tx.type === "income" && tx.status === "completed" && tx.payment_method === key).reduce((sum, tx) => sum + tx.amount, 0);
    const pengeluaran = filteredTransactions.filter(tx => tx.type === "expense" && tx.status === "completed" && tx.payment_method === key).reduce((sum, tx) => sum + tx.amount, 0);
    saldoPerMetode[key] = pemasukan - pengeluaran;
  });

  // Handler ekspor laporan (XLSX)
  const handleExport = async () => {
    if (!filteredTransactions.length) {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { Toast } = await import('@capacitor/toast');
        await Toast.show({
          text: "Tidak ada data transaksi untuk diekspor.",
          duration: 'long'
        });
      } else {
        alert("Tidak ada data transaksi untuk diekspor.");
      }
      return;
    }
    const fileName = `laporan_keuangan_${new Date().toISOString().slice(0,10)}.xlsx`;
    exportToXLSX(filteredTransactions, saldoPerMetode, fileName);
  };

  if (!businessId) {
    return (
      <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
        <div>
          <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
          <p className="text-red-500">Tidak dapat menampilkan laporan, tenant/bisnis tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  if (featureLoading) {
    return (
      <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
        <div>
          <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
          <p className="text-muted-foreground">Memuat pengaturan fitur...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
        <div>
          <h1 className="text-2xl font-bold">Laporan Keuangan</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="rounded-xl shadow-lg border-0 bg-white max-w-screen-sm mx-auto px-2 w-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-2xl font-bold">Laporan Keuangan</CardTitle>
          <p className="text-muted-foreground">
            Analisis keuangan dan laporan pendapatan laundry
          </p>
        </div>
        <Button 
          variant="outline" 
          className="flex w-full sm:w-auto"
          disabled={!canExport}
          title={!canExport ? "Fitur ekspor hanya untuk pengguna Premium" : undefined}
          onClick={canExport ? handleExport : undefined}
        >
          <Download className="mr-2 h-4 w-4" /> Ekspor Laporan
        </Button>
        {!canExport && (
          <span className="text-xs text-yellow-600 mt-1">Fitur ekspor hanya tersedia untuk pengguna <b>Premium</b>. <a href="/upgrade" className="underline">Upgrade sekarang</a> untuk akses penuh.</span>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gabungkan saldo per metode pembayaran dalam satu card grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
          {paymentMethods.map(({ key, label }) => (
            <div key={key} className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg border">
              <div className="text-xs font-semibold text-gray-500 mb-1">Saldo {label}</div>
              <div className={`text-lg font-bold ${saldoPerMetode[key] >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(saldoPerMetode[key])}</div>
            </div>
          ))}
        </div>

        {/* Gabungkan summary pendapatan, pengeluaran, profit dalam satu card grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2 bg-gray-50 rounded-lg border p-2">
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Pendapatan</div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-500 mb-1">Total Pengeluaran</div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-500 mb-1">Profit Bersih</div>
            <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</div>
          </div>
        </div>

        {/* Tombol tambah pengeluaran di atas */}
        <div className="flex flex-col sm:flex-row gap-4 mb-2">
          <Button 
            variant="default" 
            onClick={() => setShowExpenseModal(true)}
            className="w-full sm:w-auto rounded-full bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold text-base py-2 shadow-md"
          >
            + Tambah Pengeluaran
          </Button>
        </div>
        
        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select 
            value={timeFilter} 
            onValueChange={setTimeFilter}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hari Ini</SelectItem>
              <SelectItem value="this-week">Minggu Ini</SelectItem>
              <SelectItem value="this-month">Bulan Ini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          
          {timeFilter === 'custom' && (
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-[180px] justify-start text-left font-normal"
                  onClick={() => setShowCalendar(true)}
                >
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, 'dd MMM yyyy', { locale: id })} - ${format(customRange.to, 'dd MMM yyyy', { locale: id })}`
                    : 'Pilih rentang tanggal'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={1}
                  locale={id}
                />
              </PopoverContent>
            </Popover>
          )}
          
          <Select 
            value={reportType} 
            onValueChange={setReportType}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Jenis Laporan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Ringkasan</SelectItem>
              <SelectItem value="transactions">Detail Transaksi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report content */}
        {reportType === "summary" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income vs Expense Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Pendapatan vs Pengeluaran</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="aspect-square md:aspect-[1.2/1] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeVsExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} />
                      <Tooltip formatter={(value) => `Rp ${(value as number).toLocaleString("id-ID")}`} />
                      <Legend />
                      <Bar dataKey="value" name="Jumlah"
                        fill={({ name }) => name === 'Pendapatan' ? '#10b981' : '#ef4444'}
                      >
                        {incomeVsExpenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Pendapatan' ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            
            {/* Category Distribution Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Distribusi Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={categoryData.reduce((acc, item, index) => ({ ...acc, [item.name]: { color: COLORS[index % COLORS.length] } }), {})} className="aspect-square md:aspect-[1.2/1] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `Rp ${(value as number).toLocaleString("id-ID")}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* Rekap Bulanan Otomatis */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Rekap Bulanan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-2 py-2 text-left font-bold">Bulan</th>
                        <th className="px-2 py-2 text-right font-bold">Pendapatan</th>
                        <th className="px-2 py-2 text-right font-bold">Pengeluaran</th>
                        <th className="px-2 py-2 text-right font-bold">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlySummary.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-400">Tidak ada data</td></tr>
                      )}
                      {monthlySummary.map(([ym, sum]) => {
                        const [year, month] = ym.split('-');
                        const monthName = new Date(Number(year), Number(month) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                        return (
                          <tr key={ym} className="border-b">
                            <td className="px-2 py-2 font-semibold">{monthName}</td>
                            <td className="px-2 py-2 text-right text-green-600 font-bold">{formatCurrency(sum.income)}</td>
                            <td className="px-2 py-2 text-right text-red-600 font-bold">{formatCurrency(sum.expense)}</td>
                            <td className={`px-2 py-2 text-right font-bold ${sum.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(sum.profit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            {/* Grafik Tren Bulanan */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Grafik Tren Bulanan</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer className="aspect-[2/1] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} />
                      <Tooltip formatter={(value) => `Rp ${(value as number).toLocaleString("id-ID")}`} />
                      <Legend />
                      <Bar dataKey="income" name="Pendapatan" fill="#10b981" />
                      <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" />
                      <Bar dataKey="profit" name="Profit" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold">Detail Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[100px] text-xs font-bold">ID</TableHead>
                      <TableHead onClick={() => toggleSort("date")} className="cursor-pointer text-xs font-bold">
                        Tanggal <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                      </TableHead>
                      <TableHead onClick={() => toggleSort("type")} className="cursor-pointer text-xs font-bold">
                        Jenis <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                      </TableHead>
                      <TableHead className="hidden md:table-cell text-xs font-bold">Deskripsi</TableHead>
                      <TableHead onClick={() => toggleSort("category")} className="hidden md:table-cell cursor-pointer text-xs font-bold">
                        Kategori <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold">Jumlah</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow
                        key={transaction.id}
                        className={`h-12 text-xs ${transaction.status !== 'completed' ? 'bg-yellow-50' : ''}`}
                      >
                        <TableCell className="font-semibold text-xs">{getShortOrderId(transaction.id)}</TableCell>
                        <TableCell className="text-xs">
                          {new Intl.DateTimeFormat("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }).format(new Date(transaction.date))}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant={transaction.type === "income" ? "outline" : "secondary"}>
                            <span className={transaction.type === "income" ? "bg-green-50 text-green-700 border-green-200 rounded-full px-3 py-1" : "bg-red-50 text-red-700 border-red-200 rounded-full px-3 py-1"}>
                              {transaction.type === "income" ? "Pendapatan" : "Pengeluaran"}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-[200px] truncate text-xs">
                          {transaction.description}
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize text-xs">
                          {transaction.category}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <span className={transaction.type === "income" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                Menampilkan {filteredTransactions.length} transaksi
              </div>
            </CardFooter>
          </Card>
        )}
      </CardContent>
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Pengeluaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <Label>Jumlah</Label>
              <Input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required min={1} />
            </div>
            <div>
              <Label>Kategori</Label>
              <Input value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} required />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} required />
            </div>
            <div>
              <Label>Metode Pembayaran</Label>
              <Select value={expenseMethod} onValueChange={setExpenseMethod} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tunai</SelectItem>
                  <SelectItem value="transfer">Bank</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {expenseError && <div className="text-red-500 text-xs">{expenseError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)}>Batal</Button>
              <Button type="submit" variant="default" disabled={expenseLoading}>{expenseLoading ? 'Menyimpan...' : 'Simpan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default FinancialReports;
