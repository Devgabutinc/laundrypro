import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderCard } from "@/components/orders/OrderCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart } from "recharts";
import { ArrowRight, ArrowUp, ArrowDown, ShoppingCart, Archive, PackagePlus, BarChart3, Users, ArchiveRestore, MessagesSquare, Clock, Bell, Lock, UserCog, BookOpen, Shirt, Layers } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Order, OrderStatus, orderStatusLabels } from "@/models/Order";
import { ChartContainer } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Transaction } from "@/models/Transaction";
import { useContext } from "react";
import { TenantContext } from "@/contexts/TenantContext";
import { Database } from "@/integrations/supabase/types";
import { getShortOrderId } from "@/lib/utils";
import { useFeature } from "@/hooks/useFeature";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface for the Order data from Supabase
interface DbOrder {
  id: string;
  customer_id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  customerName?: string;
  items?: any[];
}

// Interface for Product data from Supabase
interface Product {
  id: string;
  name: string;
  stock_quantity: number;
}

// Helper sederhana untuk cek akses fitur
function canAccessFeature(featureName, tenantStatus, featureSettings) {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const [featureSettings, setFeatureSettings] = useState([]);
  const [featureSettingsLoaded, setFeatureSettingsLoaded] = useState(false);
  const [showRacksInfo, setShowRacksInfo] = useState(false);
  const [showDiscussionInfo, setShowDiscussionInfo] = useState(false);
  const [showNotificationInfo, setShowNotificationInfo] = useState(false);
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";
  const navigate = useNavigate();
  const [laundryName, setLaundryName] = useState('-');
  const [userFullName, setUserFullName] = useState('-');
  const [showPosUsageModal, setShowPosUsageModal] = useState(false);
  // Menggunakan hook useFeature untuk fitur diskusi dan notifikasi
  const { hasAccess: canAccessDiscussion, loading: discussionFeatureLoading } = useFeature("discussion");
  const { hasAccess: canAccessNotifications, loading: notificationsFeatureLoading } = useFeature("notifications");
  const [posUsageData, setPosUsageData] = useState({
    currentUsage: 0,
    maxUsage: 0,
    remainingUsage: 0,
    isLoading: true,
    premiumData: null as {
      planName: string;
      startDate: string;
      endDate: string;
      remainingDays: number;
      durationDays: number;
    } | null
  });
  
  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);
  
  // Fetch POS usage data
  const fetchPosUsageData = async () => {
    if (!businessId) return;
    
    setPosUsageData(prev => ({ ...prev, isLoading: true }));
    try {
      // Fetch platform settings to get max usage limits
      const { data: platformData, error: platformError } = await supabase
        .from('platform_settings')
        .select('*')
        .single();
      
      if (platformError) {
        // Silent error handling for production
      }
      
      // Default max usage for free accounts
      const defaultMaxUsage = 10;
      const maxPosUsage = platformData?.free_pos_limit || defaultMaxUsage;
      
      // Fetch current day's POS usage
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData, error: usageError } = await supabase
        .from('pos_usage')
        .select('count')
        .eq('business_id', businessId)
        .eq('usage_date', today)
        .maybeSingle();
      
      if (usageError) {
        // Silent error handling for production
      }
      
      // Fetch business data directly to get accurate premium information
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
      
      if (businessError) {
        // Silent error handling for production
      }
      
      // Get the actual tenant status from business data if available
      const actualTenantStatus = businessData?.status || tenantStatus;
      
      // Calculate usage and limits
      const currentUsage = usageData?.count || 0;
      const maxUsage = actualTenantStatus === 'premium' ? 0 : maxPosUsage;
      const remainingUsage = maxUsage === 0 ? -1 : Math.max(0, maxUsage - currentUsage);
      
      // Get premium details if applicable
      let premiumData: {
        planName: string;
        startDate: string;
        endDate: string;
        remainingDays: number;
        durationDays: number;
      } | null = null;
      
      if (actualTenantStatus === 'premium' && businessData) {
        // Use business data for premium details
        const premiumStart = businessData.premium_start ? new Date(businessData.premium_start) : new Date();
        const premiumEnd = businessData.premium_end ? new Date(businessData.premium_end) : new Date();
        const now = new Date();
        
        // Calculate remaining days exactly as in PlatformAdminTenants
        const diffTime = premiumEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Use the calculated days directly without capping at 0
        // This matches the PlatformAdminTenants calculation
        const remainingDays = diffDays;
        
        
        // Calculate total duration in days (not months)
        const durationDays = Math.ceil((premiumEnd.getTime() - premiumStart.getTime()) / (1000 * 60 * 60 * 24));
        
        // Format dates in Indonesian format
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        };
        
        // Determine plan name based on duration in days
        let planName = 'Premium';
        if (durationDays <= 31) planName = 'Premium Bulanan';
        else if (durationDays <= 93) planName = 'Premium 3 Bulan';
        else if (durationDays <= 186) planName = 'Premium 6 Bulan';
        else if (durationDays >= 365) planName = 'Premium Tahunan';
        
        premiumData = {
          planName: planName,
          startDate: formatDate(premiumStart),
          endDate: formatDate(premiumEnd),
          remainingDays,
          durationDays
        };
      }
      
      setPosUsageData({
        currentUsage,
        maxUsage,
        remainingUsage,
        isLoading: false,
        premiumData
      });
      
    } catch (error) {
      // Silent error handling for production
      toast({
        title: 'Error',
        description: 'Gagal memuat data penggunaan POS',
        variant: 'destructive'
      });
      setPosUsageData(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  useEffect(() => {
    const fetchFeatureSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await (supabase.from as any)("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) setFeatureSettings(data);
      setFeatureSettingsLoaded(true);
    };
    fetchFeatureSettings();
  }, []);
  
  useEffect(() => {
    const fetchBusinessAndProfile = async () => {
      if (!businessId || !session?.user?.id) return;
      try {
        // Fetch Nama Laundry
        const { data: businessData } = await (supabase.from as any)("businesses")
          .select("name")
          .eq("id", businessId)
          .single();
        if (businessData?.name) setLaundryName(businessData.name);

        // Fetch Nama Pengguna
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        if (profileData?.first_name || profileData?.last_name) {
          setUserFullName(`${profileData.first_name || ''} ${profileData.last_name || ''}`.trim());
        }
      } catch (e) {
        setLaundryName('-');
        setUserFullName('-');
      }
    };
    fetchBusinessAndProfile();
  }, [businessId, session?.user?.id]);
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch orders filtered by business_id
      const { data: ordersData, error: ordersError } = await supabase
        .from<'orders', Database['public']['Tables']['orders']['Row']>("orders")
        .select("*")
        .eq('business_id', businessId)
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (ordersError) throw ordersError;
      
      // Fetch customers to get names
      const { data: customersData, error: customersError } = await supabase
        .from<'customers', Database['public']['Tables']['customers']['Row']>("customers")
        .select("id, name");
        
      if (customersError) throw customersError;
      
      // Fetch order items
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from<'order_items', Database['public']['Tables']['order_items']['Row']>("order_items")
        .select("*");
        
      if (orderItemsError) throw orderItemsError;
      
      // Map customers and items to orders
      const customerArr = Array.isArray(customersData) ? customersData : [];
      const orderItemsArr = Array.isArray(orderItemsData) ? orderItemsData : [];
      const ordersArr = Array.isArray(ordersData) ? ordersData : [];
      const customerMap = new Map(customerArr.map(customer => [customer.id, customer]));
      const orderItemsMap = new Map();
      orderItemsArr.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id).push(item);
      });
      
      // Build complete orders with customer info and items
      const dbOrders = ordersArr.map(order => {
        const customer = customerMap.get(order.customer_id);
        const items = orderItemsMap.get(order.id) || [];
        
        return {
          ...order,
          customerName: customer?.name || "Unknown Customer",
          items: items
        } as DbOrder;
      });
      
      // Convert DB orders to app Order model
      const appOrders = dbOrders.map(dbOrder => ({
        id: dbOrder.id,
        customerId: dbOrder.customer_id,
        customerName: dbOrder.customerName || 'Unknown',
        customerPhone: '', // This will be fixed when needed
        status: dbOrder.status as OrderStatus,
        createdAt: new Date(dbOrder.created_at),
        updatedAt: new Date(dbOrder.updated_at),
        notes: '',
        totalPrice: dbOrder.total_price,
        items: [],
        statusHistory: [] // We'll handle this differently
      }));
      
      setOrders(appOrders);
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select("*")
        .eq('business_id', businessId);
        
      if (transactionsError) throw transactionsError;
      
      // Convert DB transactions to app Transaction model
      const transactionsArr = Array.isArray(transactionsData) ? transactionsData : [];
      const appTransactions = transactionsArr.map(tx => ({
        id: tx.id,
        type: tx.type as "income" | "expense",
        amount: tx.amount,
        description: tx.description,
        category: tx.category,
        related_order_id: tx.related_order_id,
        related_product_id: tx.related_product_id,
        date: tx.date,
        created_at: tx.created_at,
        payment_method: tx.payment_method as "cash" | "transfer" | "qris" | "credit",
        status: tx.status as "pending" | "completed" | "cancelled"
      }));
      
      setTransactions(appTransactions);
      
      // Fetch products with low stock
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select("id, name, stock_quantity")
        .eq('business_id', businessId)
        .order("stock_quantity", { ascending: true })
        .limit(20);
        
      if (productsError) throw productsError;
      
      // Perbaiki juga productsData
      const productsArr = Array.isArray(productsData) ? productsData : [];
      setProducts(productsArr);
      
    } catch (error: any) {
      toast({
        title: "Error fetching dashboard data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate dashboard metrics
  const newOrdersCount = orders.filter(order => order.status === "received").length;
  const readyOrdersCount = orders.filter(order => order.status === "ready").length;
  const totalOrdersValue = orders.reduce((total, order) => total + (order.totalPrice || 0), 0);
  
  const lowStockItems = products.filter(product => product.stock_quantity < 5).length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthIncome = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === "income" && 
             tx.status === "completed" &&
             txDate.getMonth() === currentMonth && 
             txDate.getFullYear() === currentYear;
    })
    .reduce((total, tx) => total + tx.amount, 0);
  
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  
  const previousMonthIncome = transactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return tx.type === "income" && 
             tx.status === "completed" &&
             txDate.getMonth() === previousMonth && 
             txDate.getFullYear() === previousYear;
    })
    .reduce((total, tx) => total + tx.amount, 0);
  
  const incomeChange = previousMonthIncome ? 
    ((currentMonthIncome - previousMonthIncome) / previousMonthIncome) * 100 : 
    100;
  
  // Prepare chart data
  const statusData = [
    { name: "Diterima", count: orders.filter(order => order.status === "received").length },
    { name: "Dicuci", count: orders.filter(order => order.status === "washing").length },
    { name: "Disetrika", count: orders.filter(order => order.status === "ironing").length },
    { name: "Siap Diambil", count: orders.filter(order => order.status === "ready").length },
    { name: "Selesai", count: orders.filter(order => order.status === "completed").length }
  ];

  // Calculate last 7 days daily income
  const last7DaysIncome = () => {
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayIncome = transactions
        .filter(tx => {
          const txDate = new Date(tx.date);
          return tx.type === "income" && 
                 tx.status === "completed" &&
                 txDate.getDate() === date.getDate() &&
                 txDate.getMonth() === date.getMonth() && 
                 txDate.getFullYear() === date.getFullYear();
        })
        .reduce((total, tx) => total + tx.amount, 0);
      
      result.push({
        name: new Intl.DateTimeFormat("id-ID", { 
          weekday: "short", 
          day: "numeric" 
        }).format(date),
        amount: dayIncome
      });
    }
    
    return result;
  };

  const dailyIncomeData = last7DaysIncome();

  // Handle order status update
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!session?.user) return;
    
    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);
      
      if (updateError) throw updateError;
      
      // Add status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: newStatus,
          updated_by: session.user.id
        });
      
      if (historyError) throw historyError;
      
      // Update local state
      const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
          return {
            ...order,
            status: newStatus,
            updatedAt: new Date()
          };
        }
        return order;
      });
      
      setOrders(updatedOrders);
      
      toast({
        title: "Status updated",
        description: `Order status changed to ${orderStatusLabels[newStatus]}`,
        variant: "default"
      });
      
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const canUseRacks = tenantStatus === "premium" || canAccessFeature("racks", tenantStatus, featureSettings);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden w-full max-w-screen-sm mx-auto px-2">
      {/* Modal untuk menampilkan informasi penggunaan POS */}
      <Dialog open={showPosUsageModal} onOpenChange={setShowPosUsageModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold text-gray-800">Informasi Penggunaan POS</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Detail penggunaan Point of Sale untuk hari ini
            </DialogDescription>
          </DialogHeader>
          
          {posUsageData.isLoading ? (
            <div className="py-6 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F76B3C]"></div>
              <span className="ml-2 text-gray-600">Memuat data...</span>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Status Paket</p>
                    <p className="text-base font-semibold">
                      <span className={`px-2 py-0.5 rounded-full text-sm ${tenantStatus === 'premium' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                        {tenantStatus === 'premium' ? 'Premium' : 'Free'}
                      </span>
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Penggunaan Hari Ini</p>
                    <p className="text-base font-semibold">{posUsageData.currentUsage} kali</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Batas Maksimal</p>
                    <p className="text-base font-semibold">
                      {posUsageData.maxUsage === 0 ? (
                        <span className="text-green-600">Tidak Terbatas</span>
                      ) : (
                        `${posUsageData.maxUsage} kali`
                      )}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Sisa Penggunaan</p>
                    <p className="text-base font-semibold">
                      {posUsageData.remainingUsage === -1 ? (
                        <span className="text-green-600">Tidak Terbatas</span>
                      ) : posUsageData.remainingUsage === 0 ? (
                        <span className="text-red-600">Habis</span>
                      ) : (
                        `${posUsageData.remainingUsage} kali`
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Informasi Paket Premium */}
                {tenantStatus === 'premium' && posUsageData.premiumData && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <h4 className="font-semibold text-green-800 mb-2">Detail Paket Premium</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-500">Nama Paket</p>
                        <p className="font-medium">{posUsageData.premiumData.planName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Durasi</p>
                        <p className="font-medium">{posUsageData.premiumData.durationDays} hari</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Tanggal Mulai</p>
                        <p className="font-medium">{posUsageData.premiumData.startDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Tanggal Berakhir</p>
                        <p className="font-medium">{posUsageData.premiumData.endDate}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Sisa Masa Aktif</p>
                        <p className="font-medium text-green-700">{posUsageData.premiumData.remainingDays} hari</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {tenantStatus !== 'premium' && posUsageData.remainingUsage <= 3 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-700">
                      {posUsageData.remainingUsage === 0 ? (
                        <span>Anda telah mencapai batas penggunaan POS untuk hari ini. Upgrade ke Premium untuk penggunaan tanpa batas!</span>
                      ) : (
                        <span>Sisa penggunaan POS Anda tinggal <strong>{posUsageData.remainingUsage} kali</strong> untuk hari ini. Pertimbangkan untuk upgrade ke Premium!</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                {tenantStatus !== 'premium' && (
                  <Button 
                    className="bg-[#F76B3C] hover:bg-[#e65a2d] text-white" 
                    onClick={() => {
                      setShowPosUsageModal(false);
                      navigate('/PilihPaketPremium');
                    }}
                  >
                    Upgrade ke Premium
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setShowPosUsageModal(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Card Info Laundry & User */}
      <div>
        <div className="relative rounded-lg shadow bg-white pt-3 pb-3 px-3 flex flex-col gap-2 border border-gray-100">
          {/* Badge status di kanan atas */}
          <span className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${tenantStatus === 'premium' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            {tenantStatus === 'premium' ? 'Premium' : 'Free'}
          </span>
          <div className="flex flex-row items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Nama Laundry</div>
              <div className="font-bold text-sm text-gray-800">{laundryName || '-'}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs text-gray-400">Nama Pengguna</div>
              <div className="font-semibold text-sm text-gray-700 truncate max-w-[150px]">{userFullName || '-'}</div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              {tenantStatus !== 'premium' && (
                <button
                  className="bg-[#F76B3C] hover:bg-[#e65a2d] text-white text-xs font-bold px-3 py-1.5 rounded transition whitespace-nowrap"
                  onClick={() => navigate('/PilihPaketPremium')}
                >
                  Upgrade Premium
                </button>
              )}
              <button 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded border border-gray-200 transition whitespace-nowrap"
                onClick={() => {
                  fetchPosUsageData();
                  setShowPosUsageModal(true);
                }}
              >
                Lihat Detail
              </button>
              <button 
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded border border-blue-200 transition whitespace-nowrap flex items-center"
                onClick={() => navigate('/profile-settings')}
              >
                <UserCog className="h-3 w-3 mr-1" />
                Profil
              </button>
            </div>
          </div>
        </div>
      </div>
  
      {/* Quick stats */}
      <div>
        <div className="grid grid-cols-4 gap-2">
          <Card className="rounded-md shadow border-0 bg-white px-1 py-1 flex flex-col items-center justify-between">
            <div className="flex flex-col items-center w-full gap-1 pt-0">
              <CardTitle className="text-[10px] font-semibold text-gray-600 text-center w-full">Pesanan Baru</CardTitle>
              <div className="text-base font-bold text-[#F76B3C] text-center mt-1">{newOrdersCount}</div>
            </div>
            <div className="w-full text-center pb-1 mt-1">
              <span className="text-[10px] text-gray-400">Diterima</span>
            </div>
          </Card>
          <Card className="rounded-md shadow border-0 bg-white px-1 py-1 flex flex-col items-center justify-between">
            <div className="flex flex-col items-center w-full gap-1 pt-0">
              <CardTitle className="text-[10px] font-semibold text-gray-600 text-center w-full">Pendapatan</CardTitle>
              <div className="text-[12px] font-bold text-green-600 text-center mt-1">Rp {currentMonthIncome.toLocaleString("id-ID")}</div>
            </div>
            <div className="w-full text-center pb-1 mt-1">
              <span className="text-[10px] text-gray-400">Bulan ini</span>
            </div>
          </Card>
          <Card className="rounded-md shadow border-0 bg-white px-1 py-1 flex flex-col items-center justify-between">
            <div className="flex flex-col items-center w-full gap-1 pt-0">
              <CardTitle className="text-[10px] font-semibold text-gray-600 text-center w-full">Siap Diambil</CardTitle>
              <div className="text-base font-bold text-blue-600 text-center mt-1">{readyOrdersCount}</div>
            </div>
            <div className="w-full text-center pb-1 mt-1">
              <span className="text-[10px] text-gray-400">Ready</span>
            </div>
          </Card>
          <Card className="rounded-md shadow border-0 bg-white px-1 py-1 flex flex-col items-center justify-between">
            <div className="flex flex-col items-center w-full gap-1 pt-0">
              <CardTitle className="text-[10px] font-semibold text-gray-600 text-center w-full">Stok Menipis</CardTitle>
              <div className="text-base font-bold text-yellow-600 text-center mt-1">{lowStockItems}</div>
            </div>
            <div className="w-full text-center pb-1 mt-1">
              <span className="text-[10px] text-gray-400">Produk</span>
            </div>
          </Card>
        </div>
      </div>
  
      {/* Menu Utama */}
      <div className="mt-2">
        <div className="grid grid-cols-3 gap-3 mt-4 flex-wrap">
          <Link to="/pos">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <ShoppingCart className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">POS</span>
            </Button>
          </Link>
          <Link to="/inventory">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <PackagePlus className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Inventaris</span>
            </Button>
          </Link>
          <Link to="/customers">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <Users className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Pelanggan</span>
            </Button>
          </Link>
          <Button
            className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs"
            onClick={() => {
              if (!featureSettingsLoaded) return;
              if (canUseRacks) {
                navigate("/racks");
              } else {
                setShowRacksInfo(true);
              }
            }}
            disabled={!featureSettingsLoaded}
          >
            <Layers className="h-5 w-5 text-[#F76B3C] mb-2" />
            <span className="text-sm font-semibold text-gray-700">Rak</span>
          </Button>
          <Button 
            className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs"
            onClick={() => {
              if (canAccessDiscussion) {
                navigate('/discussion');
              } else {
                setShowDiscussionInfo(true);
              }
            }}
          >
            <div className="relative">
              <MessagesSquare className="h-8 w-8 text-[#F76B3C] mb-2" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Diskusi</span>
          </Button>
          <Link to="/tracking">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <Clock className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Lacak Pesanan</span>
            </Button>
          </Link>
          <Button 
            className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs"
            onClick={() => {
              if (canAccessNotifications) {
                navigate('/notifications');
              } else {
                setShowNotificationInfo(true);
              }
            }}
          >
            <div className="relative">
              <Bell className="h-8 w-8 text-[#F76B3C] mb-2" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Notifikasi</span>
          </Button>
          <Link to="/reports">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <BarChart3 className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Laporan</span>
            </Button>
          </Link>
          <Link to="/order-archive">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <ArchiveRestore className="h-6 w-6 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Arsip</span>
            </Button>
          </Link>
          <Link to="/tutorials">
            <Button className="w-full h-20 flex flex-col items-center justify-center rounded-lg shadow bg-white p-1 text-xs">
              <BookOpen className="h-8 w-8 text-[#F76B3C] mb-2" />
              <span className="text-sm font-semibold text-gray-700">Tutorial</span>
            </Button>
          </Link>
        </div>
        {showRacksInfo && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 w-80 shadow-lg text-center">
              <h3 className="font-bold mb-2 text-lg text-red-600">Akses Ditolak</h3>
              <p className="mb-4 text-gray-700">Fitur rak hanya tersedia untuk pengguna Premium. Upgrade sekarang untuk akses penuh.</p>
              <button className="bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold px-6 py-2 rounded" onClick={() => setShowRacksInfo(false)}>Tutup</button>
            </div>
          </div>
        )}
      </div>

      {/* Discussion Info Modal */}
      <div>
        {showDiscussionInfo && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 w-80 shadow-lg text-center">
              <h3 className="font-bold mb-2 text-lg text-red-600">Akses Ditolak</h3>
              <p className="mb-4 text-gray-700">Fitur diskusi hanya tersedia untuk pengguna {tenantStatus === "premium" ? "Premium" : "Free"}. Hubungi admin untuk informasi lebih lanjut.</p>
              <button className="bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold px-6 py-2 rounded" onClick={() => setShowDiscussionInfo(false)}>Tutup</button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Premium Modal */}
      {showNotificationInfo && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-80 shadow-lg text-center">
            <h3 className="font-bold mb-2 text-lg text-red-600">Akses Ditolak</h3>
            <p className="mb-4 text-gray-700">Fitur notifikasi hanya tersedia untuk pengguna Premium. Upgrade sekarang untuk akses penuh.</p>
            <button className="bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold px-6 py-2 rounded" onClick={() => setShowNotificationInfo(false)}>Tutup</button>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-6">
        <Card className="rounded-xl shadow-md border-0 bg-white p-2 sm:p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-600">Status Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={{ status: { color: '#8b5cf6' } }} className="h-[180px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 180 : 220}>
                <BarChart data={statusData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip formatter={(value) => `${value} pesanan`} />
                  <Bar dataKey="count" name="Jumlah Pesanan" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-md border-0 bg-white p-2 sm:p-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-gray-600">Pendapatan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ChartContainer config={{ income: { color: '#10b981' } }} className="h-[180px] sm:h-[220px]">
              <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 180 : 220}>
                <LineChart data={dailyIncomeData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <Tooltip formatter={(value) => `Rp ${(value as number).toLocaleString("id-ID")}`} />
                  <Line type="monotone" dataKey="amount" name="Pendapatan" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders as Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-bold">Pesanan Terbaru</h4>
          <Link to="/orders">
            <Button variant="outline" size="lg" className="rounded-full font-bold px-4 py-2 border-2 border-[#F76B3C] text-[#F76B3C]">Lihat Semua</Button>
          </Link>
        </div>
        <div className="overflow-x-auto rounded-lg shadow bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-gray-600">ID</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Pelanggan</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody>
          {orders
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
            .slice(0, 5)
            .map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium text-gray-800">{getShortOrderId(order.id)}</td>
                    <td className="px-3 py-2 text-gray-700">{order.customerName}</td>
                    <td className="px-3 py-2">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">Rp {order.totalPrice?.toLocaleString("id-ID")}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
