import { useState, useEffect } from "react";
import { OrderStatus, orderStatusLabels } from "@/models/Order";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { getShortOrderId } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id: string;
  customer_id: string;
  status: OrderStatus;
  created_at: string;
  total_price: number;
  customerName?: string;
}

const Tracking = () => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [trackingId, setTrackingId] = useState("");
  const [searchResults, setSearchResults] = useState<OrderItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { session, businessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load orders from Supabase
  useEffect(() => {
    if (session && businessId) {
      fetchOrders();
    }
  }, [session, businessId]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders for the current tenant - only active orders (not completed or cancelled)
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, customer_id, status, created_at, total_price, business_id")
        .eq("business_id", businessId)
        .not('status', 'in', '("completed","cancelled")')
        .order("created_at", { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch customers to get names
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("id, name");
      
      if (customersError) throw customersError;
      
      // Create customer map for faster lookups
      const customerMap = new Map();
      if (customersData) {
        customersData.forEach(customer => {
          customerMap.set(customer.id, customer.name);
        });
      }
      
      // Add customer names to orders
      const ordersWithCustomerNames = ordersData?.map(order => ({
        ...order,
        customerName: customerMap.get(order.customer_id) || 'Pelanggan Tidak Dikenal'
      })) || [];
      
      setOrders(ordersWithCustomerNames);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive"
      });
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tracking
  const handleTrack = () => {
    setError("");
    
    if (!trackingId.trim()) {
      setError("Masukkan nomor pesanan");
      return;
    }
    
    // Check if searching with ORD#XXXX format
    let searchQuery = trackingId.trim();
    let searchById = false;
    
    // If using ORD#XXXX format, extract the 4 digits
    if (searchQuery.toUpperCase().startsWith('ORD#') && searchQuery.length >= 5) {
      const lastFourDigits = searchQuery.substring(4);
      // Search for orders ending with these digits
      const results = orders.filter(o => o.id.endsWith(lastFourDigits));
      
      if (results.length > 0) {
        setSearchResults(results);
        return;
      }
      searchById = true;
    }
    
    // If not found by ORD# or searching by other terms
    const results = orders.filter(o => {
      if (searchById) {
        return o.id.toLowerCase().includes(searchQuery.toLowerCase());
      } else {
        return o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase()));
      }
    });
    
    if (results.length > 0) {
      setSearchResults(results);
    } else {
      setError("Pesanan tidak ditemukan");
      setSearchResults([]);
    }
  };
  
  // Navigate to order detail
  const goToOrderDetail = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Status Tracking</h1>
        <p className="text-muted-foreground">Lacak status pesanan laundry</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Lacak Pesanan</h2>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Masukkan nomor pesanan (ORD#XXXX) atau nama pelanggan"
              value={trackingId}
              onChange={e => setTrackingId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTrack} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Cari
            </Button>
          </div>
          
          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}
          
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Hasil Pencarian</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map(order => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => goToOrderDetail(order.id)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg text-orange-600">{getShortOrderId(order.id)}</p>
                          <p className="text-sm">{order.customerName}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <Badge className="mb-2" variant={order.status === 'completed' ? 'default' : 'outline'}>
                            {orderStatusLabels[order.status as OrderStatus]}
                          </Badge>
                          <div className="flex items-center text-sm text-blue-600">
                            Detail <ArrowRight className="ml-1 h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tracking;
