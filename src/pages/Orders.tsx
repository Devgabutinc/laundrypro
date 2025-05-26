import React from "react";
import { useState, useEffect, useContext } from "react";
import { OrderCard } from "@/components/orders/OrderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus, orderStatusLabels } from "@/models/Order";
import { TenantContext } from "@/contexts/TenantContext";
import { usePosData } from "@/hooks/usePosData";
import { Wallet } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { getShortOrderId } from "@/lib/utils";

// Define the DB Order interface based on the Supabase table structure
interface DbOrder {
  id: string;
  customer_id: string;
  status: string;
  total_price: number;
  estimated_completion: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customerName?: string;
  customerPhone?: string;
  items?: { id?: string; service_name: string; quantity: number; price: number; notes?: string }[];
}

const substituteTemplate = (tpl: string, order: Order, tenant: any) => {
  return tpl
    .replace(/\(namacs\)/gi, order.customerName)
    .replace(/\(noorder\)/gi, getShortOrderId(order.id))
    .replace(/\(namatoko\)/gi, tenant?.businessName || "LaundryPro")
    .replace(/\(status\)/gi, orderStatusLabels[order.status] || order.status);
};

// Helper sederhana untuk cek akses fitur
function canAccessFeature(featureName, tenantStatus, featureSettings) {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showRakModal, setShowRakModal] = useState(false);
  const [orderForRak, setOrderForRak] = useState<Order | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [orderSlots, setOrderSlots] = useState<Record<string, any>>({});
  const { tenant } = useContext(TenantContext);
  const [waLoading, setWaLoading] = useState(false);
  const tenantStatus = tenant?.status || "free";
  const [featureSettings, setFeatureSettings] = useState([]);
  const { cancelOrder } = usePosData();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const navigate = useNavigate();


  useEffect(() => {
    const fetchFeatureSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      // Gunakan as any untuk bypass type error pada feature_settings
      const { data, error } = await (supabase.from as any)("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) setFeatureSettings(data);
    };
    fetchFeatureSettings();
  }, []);

  const canUseRacks = tenantStatus === "premium" || canAccessFeature("racks", tenantStatus, featureSettings);

  // Load orders from Supabase
  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [session]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;
      
      // Fetch customers to get names
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('business_id', businessId);
      
      if (customersError) throw customersError;
      
      // Fetch order items
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('business_id', businessId);
      
      if (orderItemsError) throw orderItemsError;
      
      // Map customers and items to orders
      const customerMap = new Map(customersData?.map(customer => [customer.id, customer]) || []);
      const orderItemsMap = new Map<string, any[]>();
      
      orderItemsData?.forEach(item => {
        if (!orderItemsMap.has(item.order_id)) {
          orderItemsMap.set(item.order_id, []);
        }
        orderItemsMap.get(item.order_id)?.push(item);
      });
      
      // Build complete orders with customer info and items
      const dbOrders = ordersData?.map(order => {
        const customer = customerMap.get(order.customer_id);
        const items = orderItemsMap.get(order.id) || [];
        
        return {
          ...order,
          customerName: customer?.name || "Unknown Customer",
          customerPhone: customer?.phone || "",
          items: items
        } as DbOrder;
      }) || [];

      // Convert DB orders to app Order model
      const appOrders = dbOrders.map(dbOrder => ({
        id: dbOrder.id,
        customerId: dbOrder.customer_id,
        customerName: dbOrder.customerName || 'Unknown',
        customerPhone: dbOrder.customerPhone || '',
        status: dbOrder.status as OrderStatus,
        createdAt: new Date(dbOrder.created_at),
        updatedAt: new Date(dbOrder.updated_at),
        notes: dbOrder.notes || undefined,
        totalPrice: dbOrder.total_price,
        items: (dbOrder.items || []).map(item => ({
          id: item.id || '',
          name: item.service_name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes
        })),
        statusHistory: [],
        payment_status: (dbOrder as any).payment_status,
      }));
      
      setOrders(appOrders);
      setFilteredOrders(appOrders);
      fetchOrderSlots(appOrders);
    } catch (error: any) {
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch slot rak untuk setiap order setelah fetchOrders
  const fetchOrderSlots = async (ordersList: Order[]) => {
    const orderIds = ordersList.map(o => o.id);
    if (orderIds.length === 0) return;
    const { data: slots } = await supabase.from('rack_slots').select('id, rack_id, position, order_id, occupied').in('order_id', orderIds).eq('occupied', true);
    const { data: racks } = await supabase.from('racks').select('id, name');
    const slotMap: Record<string, any> = {};
    (slots || []).forEach(slot => {
      slotMap[slot.order_id] = {
        rackName: (racks || []).find(r => r.id === slot.rack_id)?.name || '-',
        position: slot.position
      };
    });
    setOrderSlots(slotMap);
  };

  // Panggil fetchOrderSlots setelah setOrders
  useEffect(() => {
    fetchOrderSlots(orders);
  }, [orders]);

  // Apply filters when search or status changes
  useEffect(() => {
    let result = [...orders];
    
    // Apply search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        order => 
          (order.customerName && order.customerName.toLowerCase().includes(lowerQuery)) || 
          order.id.toLowerCase().includes(lowerQuery) ||
          (order.customerPhone && order.customerPhone.includes(searchQuery))
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(order => order.status === statusFilter);
    }
    
    setFilteredOrders(result);
  }, [searchQuery, statusFilter, orders]);

  // Handler buka modal rak
  const openRakModal = async (order: Order) => {
    setOrderForRak(order);
    // Fetch semua slot kosong
    const { data: slots } = await supabase.from('rack_slots').select('id, rack_id, position, occupied').eq('business_id', businessId).eq('occupied', false);
    // Fetch nama rak
    const { data: racks } = await supabase.from('racks').select('id, name').eq('business_id', businessId);
    // Gabungkan info slot dan nama rak
    const slotsWithRack = (slots || []).map(slot => ({
      ...slot,
      rackName: (racks || []).find(r => r.id === slot.rack_id)?.name || '-'
    }));
    setAvailableSlots(slotsWithRack);
    setShowRakModal(true);
  };

  // Handler assign rak
  const handleAssignRak = async () => {
    if (!orderForRak || !selectedSlotId) return;
    // Assign slot ke order
    await supabase.from('rack_slots').update({
      occupied: true,
      order_id: orderForRak.id,
      assigned_at: new Date().toISOString(),
      due_date: null
    }).eq('id', selectedSlotId);
    setShowRakModal(false);
    setOrderForRak(null);
    setSelectedSlotId("");
    fetchOrders();
  };


  // Handler update status, otomatis bebaskan rak jika selesai
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!session?.user) return;
    try {
      console.log('[DEBUG] Mulai update status:', { orderId, newStatus });
      await supabase.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId).eq('business_id', businessId);
      await supabase.from('order_status_history').insert({ order_id: orderId, status: newStatus, updated_by: session.user.id, business_id: businessId });
      // Jika selesai atau dibatalkan, cari slot rak yang occupied oleh order ini, lalu kosongkan
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        const { data: slots } = await supabase.from('rack_slots').select('*').eq('order_id', orderId).eq('occupied', true);
        console.log('[DEBUG] Slot rak ditemukan:', { orderId, newStatus, slots });
        for (const slot of slots || []) {
          await supabase.from('rack_slots').update({ occupied: false, order_id: null, assigned_at: null, due_date: null }).eq('id', slot.id);
        }
        console.log('[DEBUG] Slot rak dikosongkan:', { orderId, newStatus });
      }
      fetchOrders();
      toast({ title: "Status updated", description: `Order status changed to ${orderStatusLabels[newStatus]}`, variant: "default" });
    } catch (error: any) {
      console.error('[DEBUG] Error update status:', error);
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    }
  };

  // Helper: cek apakah order hanya produk
  function isOrderProduk(order: Order) {
    return order.items.length > 0;
  }

  // Helper: cek apakah order jasa
  function isOrderJasa(order: Order) {
    return order.items.length > 0;
  }

  // Fetch pending orders
  useEffect(() => {
    if (session && activeTab === 'pending') {
      fetchPendingOrders();
    }
  }, [session, activeTab]);

  const fetchPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          created_at,
          payment_status,
          status,
          customers (
            name,
            phone
          ),
          order_items (
            service_name,
            quantity,
            price
          )
        `)
        .eq('business_id', businessId)
        .eq('payment_status', 'unpaid')
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive"
      });
    }
  };

  const handleProcessPayment = (orderId: string) => {
    // Arahkan ke halaman POS dengan membawa orderId
    navigate(`/pos?pendingOrder=${orderId}`);
  };

  // Ganti dengan fungsi format tanggal sederhana
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    if (session && businessId) {
      fetchPendingOrders();
    }
  }, [session, businessId]);

  return (
    <div className="space-y-4 overflow-x-hidden w-full max-w-screen-sm mx-auto px-2">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'pending')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">Semua Pesanan</TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Belum Dibayar
            {pendingOrders.length > 0 && (
              <span className="ml-1 inline-block bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{pendingOrders.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-6 pb-8 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
            <div>
              <h2 className="text-xl font-bold mb-1">Daftar Pesanan Aktif</h2>
            </div>

            {/* Filter controls */}
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Cari pesanan, pelanggan, atau nomor telepon"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-9 rounded-md text-sm px-2"
                style={{ minWidth: 0, flex: 1 }}
              />
              <Button variant="default" onClick={() => {
                setSearchQuery("");
              }} className="rounded bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold h-9 px-3 text-xs">
                Reset
              </Button>
            </div>

            {/* Orders list as card compact */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-400">Memuat data pesanan...</div>
              ) : filteredOrders.length > 0 ? (
                filteredOrders
                  .filter(order => order.status !== 'completed' && order.status !== 'cancelled')
                  .map(order => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg shadow bg-white px-3 py-2 gap-2 cursor-pointer hover:bg-orange-50 transition-colors"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-500">{getShortOrderId(order.id)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${order.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : order.status === 'ready' ? 'bg-blue-50 text-blue-700 border-blue-200' : order.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>{orderStatusLabels[order.status]}</span>
                          {order.payment_status === 'unpaid' && (
                            <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 ml-2">Menunggu Pembayaran</span>
                          )}
                        </div>
                        <div className="text-sm font-semibold text-gray-800 truncate">{order.customerName}</div>
                        <div className="text-xs text-gray-400">Rp {order.totalPrice?.toLocaleString("id-ID")}</div>
                        {orderSlots[order.id] && (
                          <div className="inline-block bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs font-bold mb-1">
                            Lokasi Rak: {orderSlots[order.id].rackName} - {orderSlots[order.id].position}
                          </div>
                        )}
                      </div>
                      {/* Batalkan pesanan tetap ada jika status received */}
                      <div className="flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
                        {isOrderJasa(order) && (order.status === 'received' || order.status === 'waiting_payment') && (
                          <Button size="xs" variant="destructive" className="mt-1 px-2 py-1 text-xs" onClick={() => { setOrderToCancel(order); setShowCancelModal(true); }}>
                            Batalkan Pesanan
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-400">Tidak ada pesanan yang ditemukan</div>
              )}
            </div>

            {/* Tambahkan modal pilih slot rak */}
            {showRakModal && (
              <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                <div className="bg-white rounded-xl p-4 w-80">
                  <h3 className="font-bold mb-2">Pilih Slot Rak untuk {orderForRak?.customerName}</h3>
                  <select className="w-full border rounded p-2 mb-4" value={selectedSlotId} onChange={e => setSelectedSlotId(e.target.value)}>
                    <option value="">Pilih Slot Rak</option>
                    {availableSlots
                      .sort((a, b) => (a.rackName + a.position).localeCompare(b.rackName + b.position))
                      .map(slot => (
                        <option key={slot.id} value={slot.id}>{slot.rackName} - {slot.position}</option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowRakModal(false)} className="flex-1">Batal</Button>
                    <Button onClick={handleAssignRak} className="flex-1 bg-[#F76B3C] hover:bg-[#e65a2d] text-white font-bold" disabled={!selectedSlotId}>Tempatkan</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Konfirmasi Batal */}
            {showCancelModal && orderToCancel && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
                  <h2 className="text-lg font-bold mb-2">Batalkan Pesanan?</h2>
                  <p className="mb-4">Yakin ingin membatalkan pesanan <span className="font-bold">{getShortOrderId(orderToCancel.id)}</span>? Tindakan ini tidak dapat dibatalkan.</p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCancelModal(false)}>Batal</Button>
                    <Button variant="destructive" onClick={async () => {
                      if (orderToCancel && isOrderJasa(orderToCancel) && orderToCancel.status === 'received') {
                        await cancelOrder(orderToCancel.id);
                        setShowCancelModal(false);
                        setOrderToCancel(null);
                        fetchOrders();
                      }
                    }}>Ya, Batalkan</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="overflow-hidden">
            <CardHeader className="py-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Pesanan Belum Dibayar</h3>
                <Input
                  placeholder="Cari pesanan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-xs h-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-medium py-2 px-2">ID</TableHead>
                      <TableHead className="text-xs font-medium py-2 px-2">Pelanggan</TableHead>
                      <TableHead className="text-xs font-medium py-2 px-2">Info</TableHead>
                      <TableHead className="text-xs font-medium py-2 px-2">Status</TableHead>
                      <TableHead className="text-xs font-medium py-2 px-2 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders
                      .filter(order => 
                        order.customers.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        order.customers.phone.includes(searchQuery)
                      )
                      .map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs py-2 px-2">{getShortOrderId(order.id)}</TableCell>
                          <TableCell className="py-2 px-2">
                            <div className="text-xs">
                              <div className="font-medium">{order.customers.name}</div>
                              <div className="text-gray-500">{order.customers.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <div className="text-xs">
                              <div>{formatDate(order.created_at)}</div>
                              <div className="font-medium">Rp {order.total_price.toLocaleString("id-ID")}</div>
                              <div className="text-gray-500 text-[11px] mt-1">
                                {order.order_items.slice(0, 2).map((item: any, index: number) => (
                                  <div key={index} className="truncate max-w-[120px]">
                                    {item.service_name} x{item.quantity}
                                  </div>
                                ))}
                                {order.order_items.length > 2 && (
                                  <div className="text-gray-400">+{order.order_items.length - 2} lainnya</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${order.payment_status === 'unpaid' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {order.payment_status === 'unpaid' ? 'Belum Dibayar' : 'Lunas'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2 px-2">
                            <Button 
                              onClick={() => handleProcessPayment(order.id)}
                              className="bg-green-600 hover:bg-green-700 h-7 text-xs px-2 py-0"
                              size="sm"
                            >
                              Bayar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;
