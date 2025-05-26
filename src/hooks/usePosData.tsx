import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/models/Product";
import { Customer } from "@/models/Customer";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

export function usePosData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState({
    products: false,
    customers: false,
    order: false,
  });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { session, businessId } = useAuth();

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(prev => ({ ...prev, products: true }));
      setError(null);

      const { data, error } = await supabase
        .from('products')
        .select('*' as const)
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (error) throw error;

      setProducts(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error fetching products",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(prev => ({ ...prev, customers: true }));
      setError(null);

      const { data, error } = await supabase
        .from('customers')
        .select('*' as const)
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (error) throw error;

      setCustomers(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error fetching customers",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, customers: false }));
    }
  };

  // Find or create customer
  const findOrCreateCustomer = async (customerData: { name: string, phone: string }) => {
    try {
      // First check if customer exists
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('*' as const)
        .eq('phone', customerData.phone)
        .eq('business_id', businessId)
        .maybeSingle();

      if (searchError) throw searchError;

      // If customer exists, return it
      if (existingCustomer) {
        return existingCustomer;
      }

      // Otherwise create new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          name: customerData.name,
          phone: customerData.phone,
          business_id: businessId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setCustomers(prev => [...prev, newCustomer]);

      return newCustomer;
    } catch (err: any) {
      toast({
        title: "Error with customer data",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  // Create a new order
  const createOrder = async (
    customer: { name: string, phone: string },
    items: Array<{ id?: string, name: string, price: number, quantity: number, notes?: string, isProduct?: boolean }>,
    paymentMethod: string,
    cartOptions?: { pickupType?: string, estimate?: string, priority?: boolean }
  ) => {
    try {
      setLoading(prev => ({ ...prev, order: true }));
      
      if (!session?.user) {
        throw new Error("You must be logged in to create orders");
      }

      // 1. Find or create the customer
      const customerRecord = await findOrCreateCustomer(customer);

      // 2. Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 3. Cek apakah semua item adalah produk
      const allProduk = items.every(item => item.isProduct);
      const status = allProduk ? 'received' : 'received';

      // 4. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerRecord.id,
          status,
          total_price: totalPrice,
          business_id: businessId,
          delivery_type: cartOptions?.pickupType || null,
          is_priority: cartOptions?.priority || false,
          estimated_completion: cartOptions?.estimate || null,
          payment_status: 'paid',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 5. Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        service_name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
        business_id: businessId
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 6. Create status history entry
      const { error: statusError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderData.id,
          status,
          updated_by: session.user.id,
          business_id: businessId
        });
      if (statusError) throw statusError;
      
      // 6.5. Update product stock for product items
      const productItems = items.filter(item => item.isProduct && item.id);
      
      if (productItems.length > 0) {
        for (const item of productItems) {
          if (!item.id) continue;
          
          // Get current stock
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity, name')
            .eq('id', item.id)
            .single();
          
          if (fetchError) {
            continue;
          }
          
          // Calculate new stock
          const newStock = Math.max(0, product.stock_quantity - item.quantity);
          
          // Update stock in database
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.id);
          
          if (updateError) {
            continue;
          }
        }
      }

      // 7. Insert transaksi keuangan
      const { error: trxError } = await supabase
        .from('transactions')
        .insert({
          type: 'income',
          amount: totalPrice,
          description: `Pembayaran Pesanan #${orderData.id.substring(orderData.id.length - 4)}`,
          category: 'order',
          related_order_id: orderData.id,
          payment_method: paymentMethod,
          status: 'completed',
          business_id: businessId,
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        });
      if (trxError) throw trxError;

      toast({
        title: "Order created successfully",
        description: `Order #${orderData.id.substring(0, 8)} has been created`,
        variant: "default"
      });
      
      return orderData;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error creating order",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, order: false }));
    }
  };

  // Fungsi untuk membatalkan order
  const cancelOrder = async (orderId: string) => {
    try {
      // Update status order ke cancelled
      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
      // Update status history
      await supabase.from('order_status_history').insert({ order_id: orderId, status: 'cancelled', updated_by: session.user.id, business_id: businessId });
      // Update/cancel transaksi income terkait
      await supabase.from('transactions').update({ status: 'cancelled' }).eq('related_order_id', orderId);
      // Kosongkan slot rak jika ada
      const { data: slots } = await supabase.from('rack_slots').select('*').eq('order_id', orderId).eq('occupied', true);
      for (const slot of slots || []) {
        await supabase.from('rack_slots').update({ occupied: false, order_id: null, assigned_at: null, due_date: null }).eq('id', slot.id);
      }
      toast({ title: 'Pesanan dibatalkan', description: 'Pesanan berhasil dibatalkan.', variant: 'default' });
    } catch (err: any) {
      toast({ title: 'Gagal membatalkan pesanan', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const createPendingOrder = async (
    customer: { name: string, phone: string },
    items: Array<{ id?: string, name: string, price: number, quantity: number, notes?: string, isProduct?: boolean }>,
    cartOptions?: { pickupType?: string, estimate?: string, priority?: boolean }
  ) => {
    try {
      setLoading(prev => ({ ...prev, order: true }));
      
      if (!session?.user) {
        throw new Error("You must be logged in to create orders");
      }

      // 1. Find or create the customer
      const customerRecord = await findOrCreateCustomer(customer);

      // 2. Calculate total price
      const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // 3. Create the order with pending status
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerRecord.id,
          status: 'waiting_payment',
          total_price: totalPrice,
          business_id: businessId,
          delivery_type: cartOptions?.pickupType || null,
          is_priority: cartOptions?.priority || false,
          estimated_completion: cartOptions?.estimate || null,
          payment_status: 'unpaid',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        service_name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
        business_id: businessId
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
      
      // 5. Update product stock for product items
      const productItems = items.filter(item => item.isProduct && item.id);
      
      if (productItems.length > 0) {
        for (const item of productItems) {
          if (!item.id) continue;
          
          // Get current stock
          const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('stock_quantity, name')
            .eq('id', item.id)
            .single();
          
          if (fetchError) {
            continue;
          }
          
          // Calculate new stock
          const newStock = Math.max(0, product.stock_quantity - item.quantity);
          
          // Update stock in database
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock_quantity: newStock })
            .eq('id', item.id);
          
          if (updateError) {
            continue;
          }
        }
      }

      return orderData;
    } catch (error) {
      console.error('Error creating pending order:', error);
      throw error;
    } finally {
      setLoading(prev => ({ ...prev, order: false }));
    }
  };

  useEffect(() => {
    if (session && businessId) {
      fetchProducts();
      fetchCustomers();
    }
  }, [session, businessId]);

  return {
    products,
    customers,
    loading,
    error,
    fetchProducts,
    fetchCustomers,
    createOrder,
    cancelOrder,
    createPendingOrder,
  };
}
