import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getShortOrderId } from "@/lib/utils";

interface PendingOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_price: number;
  created_at: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function PendingOrders() {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { businessId } = useAuth();

  useEffect(() => {
    fetchPendingOrders();
  }, [businessId]);

  const fetchPendingOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_price,
          created_at,
          customers(name, phone),
          order_items(name, quantity, price)
        `)
        .eq('business_id', businessId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedOrders = data.map(order => ({
        id: order.id,
        customer_name: order.customers.name,
        customer_phone: order.customers.phone,
        total_price: order.total_price,
        created_at: order.created_at,
        items: order.order_items
      }));

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pesanan",
        variant: "destructive"
      });
    }
  };

  const handlePayment = async (orderId: string) => {
    // Implementasi proses pembayaran
    // Setelah pembayaran berhasil, update status order
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'received' })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Pembayaran berhasil diproses",
      });

      fetchPendingOrders(); // Refresh data
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Gagal memproses pembayaran",
        variant: "destructive"
      });
    }
  };

  const filteredOrders = orders.filter(order => 
    order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer_phone.includes(searchQuery)
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Pesanan Belum Dibayar</h1>
        <p className="text-gray-500">Daftar pesanan yang belum dibayar</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Daftar Pesanan</CardTitle>
            <Input
              placeholder="Cari pesanan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{getShortOrderId(order.id)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.customer_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(order.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                  </TableCell>
                  <TableCell>Rp {order.total_price.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {order.items.map((item, index) => (
                        <div key={index}>
                          {item.name} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button onClick={() => handlePayment(order.id)}>
                      Proses Pembayaran
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 