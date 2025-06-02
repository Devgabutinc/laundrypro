import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle, ShoppingCart } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useContext, useState, useEffect, useRef, useMemo } from "react";
import { TenantContext } from "@/contexts/TenantContext";
import { POSOrderForm } from "@/components/pos/POSOrderForm";
import { POSCart } from "@/components/pos/POSCart";
import { POSPayment } from "@/components/pos/POSPayment";
import { usePosData } from "@/hooks/usePosData";
import { useAuth } from "@/hooks/useAuth";
import { Service } from "@/models/Service";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Product } from "@/models/Product";
import { App as CapApp } from '@capacitor/app';
import { showNetworkError, isOnline } from '@/utils/networkUtils';
import type { Database } from "@/integrations/supabase/types";

// Helper sederhana untuk cek akses fitur
function canAccessFeature(featureName: string, tenantStatus: string, featureSettings: any[]): boolean {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

// Fungsi bantu konversi estimasi pengerjaan ke ISO string
function parseEstimateToISO(estimate: string): string | null {
  if (!estimate) return null;
  const hours = parseInt(estimate);
  if (!isNaN(hours)) {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    // Format ke ISO string (tanpa manipulasi offset manual)
    return now.toISOString();
  }
  return null;
}

const POS = () => {
  const { toast } = useToast();
  const { tenant } = useContext(TenantContext);
  const { session, businessId } = useAuth();
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [posUsageCount, setPosUsageCount] = useState<number>(0);
  const [posUsageLoading, setPosUsageLoading] = useState<boolean>(true);
  const { 
    products: posProducts, 
    createOrder, 
    loading,
    customers,
    createPendingOrder
  } = usePosData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("new-order");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Define types for better TypeScript support
interface CustomerType {
  name: string;
  phone: string;
  address?: string;
}

interface CartOption {
  pickupType: string;
  estimate: string;
  priority: boolean;
  rackLocation: string;
  estimatedCompletion?: string | null;
}

interface PosUsageData {
  currentUsage: number;
  maxUsage: number;
  remainingUsage: number;
  isLoading: boolean;
  premiumData: {
    planName: string;
    startDate: string;
    endDate: string;
    remainingDays: number;
    durationDays: number;
  } | null;
}

interface CartItem {
  id?: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  isProduct?: boolean;
}
  
  const [customer, setCustomer] = useState<CustomerType>({ name: "", phone: "", address: "" });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [businessProfile, setBusinessProfile] = useState<any>(null);
  const [featureSettings, setFeatureSettings] = useState<Array<{
    feature_name: string;
    is_free: boolean;
    is_premium: boolean;
  }>>([]);
  const [featureLoading, setFeatureLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'customer' | 'order' | 'cart' | 'payment'>('customer');
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderToPay, setPendingOrderToPay] = useState<any>(null);
  const [searchParams] = useSearchParams();
  const [cartOptions, setCartOptions] = useState<CartOption>({
    pickupType: 'customer_come', // Default value
    estimate: '',
    priority: false,
    rackLocation: ''
  });
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  // State untuk melacak stok produk sementara di UI
  const [tempProductStock, setTempProductStock] = useState<{[key: string]: number}>({});
  const backHandlerRef = useRef<any>(null);

  // Tambahkan fungsi untuk memuat data pesanan yang akan dibayar
  const loadPendingOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          customers (
            name,
            phone,
            address
          ),
          order_items (
            service_name,
            quantity,
            price,
            notes
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Set data customer
      if (data.customers) {
        // Ensure we're getting a single customer object, not an array
        const customerData = Array.isArray(data.customers) ? data.customers[0] : data.customers;
        
        // Create a properly typed customer object with required fields
        const customerInfo: CustomerType = {
          name: typeof customerData?.name === 'string' ? customerData.name : "",
          phone: typeof customerData?.phone === 'string' ? customerData.phone : ""
        };
        
        // Only add address if it exists and is a string
        if (customerData && 'address' in customerData && typeof customerData.address === 'string') {
          customerInfo.address = customerData.address;
        }
        
        setCustomer(customerInfo);
      }

      // Set data cart items
      const items = data.order_items.map((item: any) => ({
        id: item.id,
        name: item.service_name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes
      }));
      setCartItems(items);

      // Set pending order
      setPendingOrderToPay(data);
      
      // Arahkan ke halaman pembayaran
      setCurrentStep('payment');
      setActiveTab('new-order');
    } catch (error) {
      // Error handled via state management
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive"
      });
    }
  };

  // Handle transaction completion - online only
  const handleCompleteTransaction = async (paymentData: any) => {
    try {
      if (!session) {
        toast({
          title: "Not Authenticated",
          description: "You must be logged in to complete transactions",
          variant: "destructive"
        });
        return;
      }
      
      // Cek apakah perangkat online atau offline
      if (!isOnline()) {
        showNetworkError("Tidak dapat memproses transaksi tanpa koneksi internet. Silakan periksa koneksi Anda dan coba lagi.");
        return;
      }
      
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const discount = paymentData.discount || 0;
      const total = Math.max(0, subtotal - discount);
      const amountReceived = paymentData.amountReceived || total;
      const change = paymentData.method === "cash" ? Math.max(0, amountReceived - total) : 0;

      // Konversi estimasi pengerjaan
      const estimatedCompletion = parseEstimateToISO(cartOptions.estimate);
      const cartOptionsWithISO = { ...cartOptions, estimate: estimatedCompletion };
      let newOrderId = null;
      
      // Mode online - normal flow
      // Increment POS usage count
      await incrementPosUsage();
      
      if (pendingOrderToPay) {
          // Update existing pending order (update payment_status dan estimated_completion saja, JANGAN update status)
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_status: 'paid', // Tandai sudah dibayar
              estimated_completion: estimatedCompletion
            })
            .eq('id', pendingOrderToPay.id);

          if (updateError) throw updateError;
          newOrderId = pendingOrderToPay.id;

          // Simpan informasi pembayaran ke tabel transactions
          const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
              type: 'income',
              amount: total,
              description: `Pembayaran pesanan ${pendingOrderToPay.id}`,
              category: 'laundry',
              related_order_id: pendingOrderToPay.id,
              payment_method: paymentData.method,
              status: 'completed',
              business_id: businessId
            });

          if (transactionError) throw transactionError;
        } else {
          // Create new order
          // Prepare data for createOrder
          // Process cart items
          
          const mappedItems = cartItems.map(item => ({
            id: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
            isProduct: item.isProduct // Tambahkan properti isProduct
          }));
          
          // Send mapped items to createOrder
          
          // Ensure customer has the correct type expected by createOrder
          const customerData: { name: string, phone: string, address?: string } = {
            name: customer.name,
            phone: customer.phone
          };
          
          // Only add address if it exists
          if (customer.address) {
            customerData.address = customer.address;
          }
          
          const orderData = await createOrder(
            customerData,
            mappedItems,
            paymentData.method,
            { ...cartOptions, estimate: estimatedCompletion }
          );
          newOrderId = orderData.id;

          // Update slot rak jika dipilih
          if (cartOptions.rackLocation) {
            await supabase.from('rack_slots').update({
              order_id: orderData.id,
              occupied: true,
              assigned_at: new Date().toISOString()
            }).eq('id', cartOptions.rackLocation);
          }
        }

        // Reset state dan stok sementara
        // Reset stok sementara
        setTempProductStock({});
        
        // Tandai bahwa stok telah diperbarui untuk di-refresh di halaman Inventory
        localStorage.setItem('inventory_needs_refresh', 'true');
        
        // Reset state lainnya
        setCartItems([]);
        setCustomer({ name: "", phone: "" }); // Reset customer with minimal required fields
        setPendingOrderToPay(null);
        setCurrentStep('customer');

        // Redirect ke halaman detail order
      if (newOrderId) {
        navigate(`/orders/${newOrderId}`);
        return;
      }
    } catch (error: any) {
      console.error('Error completing transaction:', error);
      // Error handled via state management
      toast({
        title: "Error",
        description: "Gagal memproses pembayaran. Coba lagi nanti.",
        variant: "destructive"
      });
    }
  };

  const handleSaveForLater = async () => {
    try {
      // Check if user has reached POS usage limit
      if (hasReachedPosLimit) {
        toast({
          title: "Batas Penggunaan POS Tercapai",
          description: `Anda telah mencapai batas penggunaan POS untuk hari ini (${posUsageCount}/${posUsageLimit}). Upgrade ke Premium untuk penggunaan tanpa batas.`,
          variant: "destructive"
        });
        return;
      }
      
      if (!customer.name || !customer.phone) {
        toast({
          title: "Data Tidak Lengkap",
          description: "Silakan lengkapi data pelanggan terlebih dahulu.",
          variant: "destructive"
        });
        return;
      }

      // Periksa stok semua produk sebelum membuat pesanan
      try {
        // Filter hanya item produk (bukan layanan)
        const productItems = cartItems.filter(item => item.isProduct);
        
        // Periksa stok untuk setiap produk - hanya validasi, tidak mengurangi stok
        for (const item of productItems) {
          // Validasi stok tanpa mengurangi stok sementara
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity, name')
            .eq('id', item.productId)
            .single();

          if (fetchError) throw fetchError;
          
          if (product.stock_quantity < item.quantity) {
            throw new Error(`Stok tidak mencukupi untuk ${product.name}. Tersedia: ${product.stock_quantity}, Diminta: ${item.quantity}`);
          }
        }
        
        // Reset stok sementara - stok sebenarnya akan diperbarui oleh createPendingOrder
        setTempProductStock({});
        
        // Tandai bahwa stok telah diperbarui untuk di-refresh di halaman Inventory
        localStorage.setItem('inventory_needs_refresh', 'true');
      } catch (error: any) {
        toast({
          title: "Error Stok Produk",
          description: error.message || "Terjadi kesalahan saat memeriksa stok produk",
          variant: "destructive"
        });
        return;
      }

      // Konversi estimasi pengerjaan
      const estimatedCompletion = parseEstimateToISO(cartOptions.estimate);
      
      // Buat pesanan tertunda
      const orderData = await createPendingOrder(
        customer,
        cartItems,
        {
          ...cartOptions,
          estimatedCompletion
        }
      );
      
      // Increment POS usage count
      await incrementPosUsage();
      
      // Reset state
      setCartItems([]);
      setCustomer({ name: "", phone: "", address: "" });
      setCurrentStep('customer');

      // Redirect ke tab Orders (transactions) dan filter status belum dibayar
      navigate('/orders');
      toast({
        title: "Berhasil",
        description: "Pesanan berhasil disimpan, silakan lakukan pembayaran di menu Pesanan Belum Dibayar.",
      });
    } catch (error) {
      // Error handled via state management
      toast({
        title: "Error",
        description: "Gagal menyimpan pesanan",
        variant: "destructive"
      });
    }
  };

  // Fetch transactions when tab changes to transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      if (activeTab === "transactions" && session) {
        try {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data, error } = await supabase
            .from('orders')
            .select(`
              id,
              total_price,
              status,
              created_at,
              customers(name, phone)
            `)
            .eq('business_id', businessId)
            .eq('payment_status', 'unpaid')
            .not('status', 'eq', 'cancelled')
            .order('created_at', { ascending: false })
            .limit(100);

          if (error) throw error;

          setTransactions(data || []);
        } catch (err: any) {
          // Error handled via state management
          toast({
            title: "Error loading transactions",
            description: err.message,
            variant: "destructive"
          });
        }
      }
    };

    fetchTransactions();
  }, [activeTab, session]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!businessId) return;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from('services')
          .select('*' as const)
          .eq('business_id', businessId)
          .order('name', { ascending: true });
        if (error) throw error;
        setServices(data || []);
      } catch (err) {
        setServices([]);
      }
    };
    fetchServices();
  }, [businessId]);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!businessId) return;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data, error } = await supabase
          .from('businesses')
          .select('*' as const)
          .eq('id', businessId)
          .single();
        if (error) throw error;
        setBusinessProfile(data);
      } catch (err) {
        setBusinessProfile(null);
      }
    };
    fetchBusinessProfile();
  }, [businessId]);

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
  
  // Fetch platform settings
  useEffect(() => {
    const fetchPlatformSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("*")
          .limit(1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          setPlatformSettings(data[0]);
        }
      } catch (error) {
        // Error handled via state management
      }
    };
    
    fetchPlatformSettings();
  }, []);

  // Fetch and track POS usage
  useEffect(() => {
    const fetchPosUsage = async () => {
      if (!businessId) return;
      
      setPosUsageLoading(true);
      try {
        // Check current usage for today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        
        const { data, error } = await supabase
          .from("pos_usage_tracking")
          .select("usage_count")
          .eq("business_id", businessId)
          .eq("usage_date", today)
          .maybeSingle();
        
        if (error) throw error;
        
        if (data) {
          setPosUsageCount(data.usage_count);
        } else {
          setPosUsageCount(0);
        }
      } catch (error) {
        // Error handled via state management
        console.error('Error fetching POS usage:', error);
        // Tidak perlu menampilkan toast error untuk pengguna
      } finally {
        setPosUsageLoading(false);
      }
    };
    
    // Hanya fetch jika online
    if (isOnline()) {
      fetchPosUsage();
    }
  }, [businessId]);

  useEffect(() => {
    const pendingOrderId = searchParams.get('pendingOrder');
    if (pendingOrderId) {
      loadPendingOrder(pendingOrderId);
    }
  }, [searchParams]);

  const tenantStatus = tenant?.status || "free";
  const isStrukClean = tenantStatus === "premium" || canAccessFeature("print_receipt", tenantStatus, featureSettings);
  
  // Check if user has reached POS usage limit
  const posUsageLimit = useMemo(() => {
    if (!platformSettings) return 0;
    return tenantStatus === "premium" 
      ? platformSettings.max_pos_usage_premium 
      : platformSettings.max_pos_usage_free;
  }, [platformSettings, tenantStatus]);
  
  const hasReachedPosLimit = useMemo(() => {
    // If posUsageLimit is 0, it means unlimited usage (for premium users)
    if (posUsageLimit === 0) return false;
    
    // Otherwise, check if current usage count has reached the limit
    return posUsageCount >= posUsageLimit;
  }, [posUsageCount, posUsageLimit]);
  
  // Function to increment POS usage count
  const incrementPosUsage = async () => {
    if (!businessId) return;
    
    // Cek apakah online atau offline
    const online = isOnline();
    
    if (!online) {
          // App is now online-only, show network error
      showNetworkError("Tidak dapat memproses transaksi tanpa koneksi internet. Silakan periksa koneksi Anda dan coba lagi.");
      return;
    }
    
    // Mode online
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Try to update existing record first
      const { data, error } = await supabase
        .from("pos_usage_tracking")
        .upsert({
          business_id: businessId,
          usage_date: today,
          usage_count: posUsageCount + 1
        }, {
          onConflict: 'business_id,usage_date'
        });
      
      if (error) {
        console.error('Error updating POS usage:', error);
        throw error;
      }
      
      // Increment local counter untuk UI
      setPosUsageCount(prevCount => prevCount + 1);
    } catch (error) {
      console.error('Error tracking POS usage:', error);
      // Show network error instead of using offline storage
      showNetworkError("Terjadi kesalahan saat melacak penggunaan POS. Silakan periksa koneksi internet Anda.");
    }
  };

  const handleUpdateCartOptions = (newOptions: CartOption) => {
    setCartOptions(newOptions);
  };

  // Fungsi untuk memeriksa ketersediaan stok tanpa mengurangi stok di database
  const checkProductStock = async (productId: string, quantity: number) => {
    try {
      // Cek stok dari state produk yang sudah diperbarui dengan stok sementara
      const product = products.find(p => p.id === productId);
      if (!product) {
        throw new Error('Produk tidak ditemukan');
      }
      
      // Hitung stok yang tersedia setelah dikurangi stok sementara
      const tempReduction = tempProductStock[productId] || 0;
      const availableStock = product.stock_quantity - tempReduction;
      
      if (availableStock < quantity) {
        throw new Error(`Stok tidak mencukupi. Tersedia: ${availableStock}`);
      }
      
      // Perbarui stok sementara di UI
      const newTempStock = (tempProductStock[productId] || 0) + quantity;
      
      setTempProductStock(prev => ({
        ...prev,
        [productId]: newTempStock
      }));
      
      // Perbarui juga display stok di produk
      setProducts(prevProducts => 
        prevProducts.map(p => {
          if (p.id === productId) {
            const newDisplayStock = p.stock_quantity - newTempStock;
            return {
              ...p,
              stock_quantity_display: newDisplayStock
            };
          }
          return p;
        })
      );
      
      // Mengembalikan true jika stok mencukupi
      return true;
    } catch (error) {
      throw error;
    }
  };
  
  // Fungsi untuk mengurangi stok saat pesanan benar-benar dibuat
  const handleUpdateStock = async (productId: string, quantity: number) => {
    try {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity, name')
        .eq('id', productId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const newStock = product.stock_quantity - quantity;
      
      if (newStock < 0) {
        throw new Error('Stok tidak mencukupi');
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }
      
      // Perbarui state produk lokal setelah berhasil memperbarui database
      setProducts(prevProducts => 
        prevProducts.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              stock_quantity: newStock,
              stock_quantity_display: newStock
            };
          }
          return p;
        })
      );
      
      // Tandai bahwa stok telah diperbarui untuk di-refresh di halaman Inventory
      localStorage.setItem('inventory_needs_refresh', 'true');

      // Refresh data produk
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Gagal memperbarui stok",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const fetchProducts = async () => {
    try {
      if (!businessId) return;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Gagal mengambil data produk",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!businessId) {
      return;
    }
    fetchProducts();
  }, [businessId]);

  // Handler tombol back Android khusus POS
  useEffect(() => {
    let isMounted = true;
    CapApp.addListener('backButton', (event) => {
      if (!isMounted) return;
      if (currentStep === 'payment') {
        setCurrentStep('cart');
      } else if (currentStep === 'cart') {
        setCurrentStep('order');
      } else if (currentStep === 'order') {
        setCurrentStep('customer');
      } else if (currentStep === 'customer') {
        navigate('/');
      }
    }).then((handler: { remove: () => void }) => {
      backHandlerRef.current = handler;
    }).catch((error: Error) => {
      console.error('Error setting up back button handler:', error);
    });
    return () => {
      isMounted = false;
      if (backHandlerRef.current && backHandlerRef.current.remove) {
        backHandlerRef.current.remove();
      }
    };
  }, [currentStep, navigate]);

  return (
    <div className="container px-2 py-4 space-y-4 max-w-md mx-auto">
     
      {/* POS Usage Limit Warning */}
      {hasReachedPosLimit && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Batasan Penggunaan POS</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Anda telah mencapai batas penggunaan POS untuk hari ini ({posUsageCount}/{posUsageLimit}).</p>
                <p className="mt-1">Upgrade ke paket Premium untuk penggunaan POS tanpa batas.</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                    onClick={() => navigate('/PilihPaketPremium')}
                  >
                    Upgrade ke Premium
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Tabs value="new-order" className="w-full">
        <TabsContent value="new-order" className="space-y-4 mt-4">
          {currentStep === 'customer' && (
              <Card className="rounded-xl shadow-md border-0 bg-white w-full max-w-md mx-auto">
                <CardHeader className="pb-1 pt-3 px-4">
                  <CardTitle className="text-base font-semibold text-gray-600">Data Pelanggan</CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-2">
                  <div className="space-y-3">
                    <div className="space-y-2 relative">
                      <Label htmlFor="customer-autocomplete" className="font-semibold">Cari / Pilih Pelanggan</Label>
                      <Input
                        id="customer-autocomplete"
                        placeholder="Ketik nama atau nomor HP"
                        value={customerSearch}
                        onChange={e => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="h-10 rounded-lg text-base"
                        autoComplete="off"
                      />
                      {showCustomerDropdown && customerSearch && (
                        <div className="absolute z-10 bg-white border rounded w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                          {customers.filter(c =>
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.phone.includes(customerSearch)
                          ).length > 0 ? (
                            customers.filter(c =>
                              c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                              c.phone.includes(customerSearch)
                            ).map(c => (
                              <div
                                key={c.id}
                                className="px-3 py-2 hover:bg-orange-100 cursor-pointer"
                                onClick={() => {
                                  setCustomer({ name: c.name, phone: c.phone, address: c.address || '' });
                                  setSelectedCustomerId(c.id);
                                  setCustomerSearch(`${c.name} (${c.phone})`);
                                  setShowCustomerDropdown(false);
                                }}
                              >
                                {c.name} <span className="text-xs text-gray-500">({c.phone})</span>
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500">Tidak ditemukan. Isi manual untuk tambah customer baru.</div>
                          )}
                        </div>
                      )}
                      {/* Klik di luar untuk tutup dropdown */}
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 9, display: showCustomerDropdown ? 'block' : 'none' }}
                        onClick={() => setShowCustomerDropdown(false)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-name" className="font-semibold">Nama Pelanggan</Label>
                      <Input
                        id="customer-name"
                        placeholder="Masukkan nama pelanggan"
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        className="h-10 rounded-lg text-base"
                        disabled={selectedCustomerId && selectedCustomerId !== "new" && customer.name === customerSearch.split(' (')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone" className="font-semibold">Nomor HP</Label>
                      <Input
                        id="customer-phone"
                        placeholder="Masukkan nomor HP pelanggan"
                        value={customer.phone}
                        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                        className="h-10 rounded-lg text-base"
                        disabled={selectedCustomerId && selectedCustomerId !== "new" && customer.phone === (customerSearch.match(/\(([^)]+)\)/)?.[1] || "")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-address" className="font-semibold">Alamat (Opsional)</Label>
                      <Input
                        id="customer-address"
                        placeholder="Masukkan alamat pelanggan (opsional)"
                        value={customer.address}
                        onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        className="h-10 rounded-lg text-base"
                        disabled={selectedCustomerId && selectedCustomerId !== "new" && customer.address === (customers.find(c => c.id === selectedCustomerId)?.address || "")}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3 md:px-6 md:py-4">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      if (!customer.name || !customer.phone) {
                        toast({
                          title: "Data Tidak Lengkap",
                          description: "Silakan lengkapi data pelanggan terlebih dahulu.",
                          variant: "destructive"
                        });
                        return;
                      }
                      setCurrentStep('order');
                    }}
                  >
                    Lanjut ke Pemesanan
                  </Button>
                </CardFooter>
              </Card>
          )}

          {currentStep === 'order' && (
            <Card className="rounded-xl shadow-md border-0 bg-white w-full max-w-md mx-auto">
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-base font-semibold text-gray-600">Pilih Layanan/Produk</CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-2">
                <div className="flex gap-2 mb-2 justify-end flex-row-reverse">
                  <Button variant="outline" onClick={() => setCurrentStep('customer')}>
                    Kembali
                  </Button>
                  <Button variant="default" onClick={() => setCurrentStep('cart')}>
                    <ShoppingCart className="w-5 h-5 mx-auto" />
                  </Button>
                </div>
                <POSOrderForm 
                  products={products}
                  services={services}
                  onAddToCart={(item) => {
                    // Tambahkan item ke keranjang
                    setCartItems([...cartItems, item]);
                    setCurrentStep('cart');
                    
                    // Perbarui tampilan produk dengan stok sementara
                    if (item.isProduct && item.productId) {
                      setProducts(prevProducts => 
                        prevProducts.map(p => {
                          if (p.id === item.productId) {
                            // Hitung stok sementara yang sudah dikurangi
                            const tempReduction = tempProductStock[p.id] || 0;
                            return {
                              ...p,
                              // Tampilkan stok yang sudah dikurangi stok sementara
                              stock_quantity_display: p.stock_quantity - tempReduction
                            };
                          }
                          return p;
                        })
                      );
                    }
                  }}
                  loading={loading.products}
                  checkProductStock={checkProductStock}
                  hasReachedPosLimit={hasReachedPosLimit}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'cart' && (
            <Card className="rounded-xl shadow-md border-0 bg-white w-full max-w-md mx-auto">
              <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-600">Keranjang Belanja</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('order')}>
                  Tambah Item
                </Button> 
              </CardHeader>
              <CardContent className="px-4 py-2">
                <POSCart 
                  items={cartItems}
                  customer={customer}
                  onUpdateQuantity={(index, newQuantity) => {
                    const oldQuantity = cartItems[index].quantity;
                    const item = cartItems[index];
                    const updatedItems = [...cartItems];
                    
                    // Jika item adalah produk, perbarui stok sementara
                    if (item.isProduct && item.productId) {
                      // Hitung selisih kuantitas
                      const quantityDiff = newQuantity - oldQuantity;
                      
                      if (quantityDiff !== 0) {
                        // Jika menambah kuantitas, periksa stok dulu
                        if (quantityDiff > 0) {
                          const product = products.find(p => p.id === item.productId);
                          if (product) {
                            const tempReduction = tempProductStock[item.productId] || 0;
                            const availableStock = product.stock_quantity - tempReduction;
                            
                            // Jika stok tidak cukup, batasi kuantitas
                            if (quantityDiff > availableStock) {
                              const maxQuantity = oldQuantity + availableStock;
                              updatedItems[index].quantity = maxQuantity;
                              toast({
                                title: "Stok tidak mencukupi",
                                description: `Stok tersedia: ${availableStock}`,
                                variant: "destructive"
                              });
                              setCartItems(updatedItems);
                              return;
                            }
                          }
                        }
                        
                        // Perbarui stok sementara
                        setTempProductStock(prev => {
                          const updated = {...prev};
                          updated[item.productId] = (updated[item.productId] || 0) + quantityDiff;
                          if (updated[item.productId] <= 0) {
                            delete updated[item.productId];
                          }
                          return updated;
                        });
                        
                        // Perbarui tampilan produk
                        setProducts(prevProducts => 
                          prevProducts.map(p => {
                            if (p.id === item.productId) {
                              const tempReduction = (tempProductStock[p.id] || 0) + quantityDiff;
                              return {
                                ...p,
                                stock_quantity_display: p.stock_quantity - tempReduction
                              };
                            }
                            return p;
                          })
                        );
                      }
                    }
                    
                    // Perbarui item di keranjang
                    updatedItems[index].quantity = newQuantity;
                    if (newQuantity <= 0) {
                      // Jika kuantitas 0, hapus item dari keranjang
                      const itemToRemove = updatedItems[index];
                      updatedItems.splice(index, 1);
                      
                      // Reset stok sementara jika item dihapus
                      if (itemToRemove.isProduct && itemToRemove.productId) {
                        setTempProductStock(prev => {
                          const updated = {...prev};
                          if (updated[itemToRemove.productId]) {
                            updated[itemToRemove.productId] -= oldQuantity;
                            if (updated[itemToRemove.productId] <= 0) {
                              delete updated[itemToRemove.productId];
                            }
                          }
                          return updated;
                        });
                      }
                    }
                    setCartItems(updatedItems);
                  }}
                  onRemoveItem={(index) => {
                    const itemToRemove = cartItems[index];
                    const updatedItems = [...cartItems];
                    updatedItems.splice(index, 1);
                    setCartItems(updatedItems);
                    
                    // Jika item yang dihapus adalah produk, kembalikan stok sementara
                    if (itemToRemove.isProduct && itemToRemove.productId) {
                      // Kurangi stok sementara
                      setTempProductStock(prev => {
                        const updated = {...prev};
                        if (updated[itemToRemove.productId]) {
                          updated[itemToRemove.productId] -= itemToRemove.quantity;
                          if (updated[itemToRemove.productId] <= 0) {
                            delete updated[itemToRemove.productId];
                          }
                        }
                        return updated;
                      });
                      
                      // Perbarui tampilan produk
                      setProducts(prevProducts => 
                        prevProducts.map(p => {
                          if (p.id === itemToRemove.productId) {
                            // Hitung stok sementara yang tersisa setelah item dihapus
                            const tempReduction = tempProductStock[p.id] || 0;
                            const newTempReduction = Math.max(0, tempReduction - itemToRemove.quantity);
                            return {
                              ...p,
                              // Tampilkan stok yang sudah dikembalikan
                              stock_quantity_display: p.stock_quantity - newTempReduction
                            };
                          }
                          return p;
                        })
                      );
                    }
                  }}
                  onCheckout={() => setCurrentStep('payment')}
                  onSaveForLater={handleSaveForLater}
                  hasReachedPosLimit={hasReachedPosLimit}
                  posUsageCount={posUsageCount}
                  posUsageLimit={posUsageLimit}
                  onUpdateCartOptions={handleUpdateCartOptions}
                  cartOptions={cartOptions}
                />
              </CardContent>
            </Card>
          )}

          {currentStep === 'payment' && (
            <Card className="rounded-xl shadow-md border-0 bg-white w-full max-w-md mx-auto">
              <CardHeader className="pb-1 pt-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-600">Pembayaran</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setCurrentStep('cart')}>
                  Kembali
                </Button>
              </CardHeader>
              <CardContent className="px-4 py-2">
                <POSPayment
                  customerName={customer.name}
                  items={cartItems}
                  totalAmount={cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
                  onBack={() => setCurrentStep('cart')}
                  onComplete={handleCompleteTransaction}
                  businessProfile={businessProfile}
                  isPendingOrder={!!pendingOrderToPay}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default POS;
