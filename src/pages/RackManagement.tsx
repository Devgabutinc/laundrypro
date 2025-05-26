import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, CheckCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Order } from "@/models/Order";
import { Rack, RackSlot } from "@/models/Rack";
import { useLocation, Navigate, Routes } from "react-router-dom";

const RackManagement = () => {
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const location = useLocation();
  const [racks, setRacks] = useState<Rack[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<RackSlot | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editRack, setEditRack] = useState<Rack | null>(null);
  const [rackForm, setRackForm] = useState({ name: "", description: "", total_slots: 1 });
  const [saving, setSaving] = useState(false);
  
  // Load data from Supabase
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch racks
      const { data: racksData, error: racksError } = await supabase
        .from('racks')
        .select<any, any>('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });
      
      if (racksError) throw racksError;
      
      // Fetch rack slots
      const { data: slotsData, error: slotsError } = await supabase
        .from('rack_slots')
        .select('*')
        .eq('business_id', businessId)
        .order('position', { ascending: true });
        
      if (slotsError) throw slotsError;
      
      // Fetch orders that need rack space (status ironing or ready)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_id, status, total_price, created_at, updated_at, notes')
        .eq('business_id', businessId)
        .in('status', ['ironing', 'ready']);
        
      if (ordersError) throw ordersError;
      
      // Fetch customers to get names
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('business_id', businessId);
        
      if (customersError) throw customersError;
      
      // Map customers to orders
      const customerMap = new Map(customersData?.map(customer => [customer.id, customer]) || []);
      
      const ordersWithCustomers = ordersData?.map(order => ({
        id: order.id,
        customerId: order.customer_id,
        customerName: customerMap.get(order.customer_id)?.name || 'Unknown',
        customerPhone: customerMap.get(order.customer_id)?.phone || '',
        status: order.status,
        createdAt: order.created_at ? new Date(order.created_at) : new Date(),
        updatedAt: order.updated_at ? new Date(order.updated_at) : new Date(),
        notes: order.notes || '',
        totalPrice: order.total_price,
        items: [],
        statusHistory: []
      }) as Order) || [];
      
      // Group slots by rack_id
      const slotsByRack = new Map<string, RackSlot[]>();
      slotsData?.forEach(slot => {
        if (!slotsByRack.has(slot.rack_id)) {
          slotsByRack.set(slot.rack_id, []);
        }
        slotsByRack.get(slot.rack_id)?.push({
          id: slot.id,
          rack_id: slot.rack_id,
          position: slot.position,
          occupied: slot.occupied,
          order_id: slot.order_id,
          assigned_at: slot.assigned_at,
          due_date: slot.due_date
        } as RackSlot);
      });
      
      // Build complete racks with slots
      const completeRacks = racksData?.map(rack => {
        const rackSlots = slotsByRack.get(rack.id) || [];
        const occupiedSlots = rackSlots.filter(slot => slot.occupied).length;
        
        return {
          id: rack.id,
          name: rack.name,
          description: rack.description,
          total_slots: rack.total_slots,
          available_slots: rack.total_slots - occupiedSlots,
          slots: rackSlots
        } as Rack;
      }) || [];
      
      setRacks(completeRacks);
      setOrders(ordersWithCustomers);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error fetching data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Find orders not already assigned to a slot
  const availableOrders = orders.filter(order => {
    return !racks.some(rack => 
      rack.slots.some(slot => slot.order_id === order.id)
    );
  });

  const handleAssignOrder = async () => {
    if (!selectedSlot || !selectedOrder) return;
    
    try {
      // Update the slot with the order
      const { error: updateError } = await supabase
        .from('rack_slots')
        .update({
          occupied: true,
          order_id: selectedOrder,
          assigned_at: new Date().toISOString(),
          due_date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString() // Due in 2 days
        })
        .eq('id', selectedSlot.id);
        
      if (updateError) throw updateError;
      
      // Update local state
      const updatedRacks = racks.map(rack => {
        if (rack.id === selectedRack?.id) {
          const updatedSlots = rack.slots.map(slot => {
            if (slot.id === selectedSlot.id) {
              return {
                ...slot,
                occupied: true,
                order_id: selectedOrder,
                assigned_at: new Date().toISOString(),
                due_date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString()
              };
            }
            return slot;
          });
          
          return {
            ...rack,
            available_slots: rack.available_slots - 1,
            slots: updatedSlots
          };
        }
        return rack;
      });
      
      setRacks(updatedRacks);
      setShowAssignDialog(false);
      setSelectedSlot(null);
      
      const order = orders.find(o => o.id === selectedOrder);
      
      toast({
        title: "Pesanan ditempatkan",
        description: `${order?.customerName} (${shortId(order?.id)}) telah ditempatkan di rak.`,
        variant: "default"
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error("Error assigning order:", error);
      toast({
        title: "Error assigning order",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSlotClick = (rack: Rack, slot: RackSlot) => {
    if (slot.occupied) {
      // Show order details if occupied
      const order = orders.find(o => o.id === slot.order_id);
      if (order) {
        toast({
          title: `Rak ${rack.name}, Slot ${slot.position}`,
          description: `Pesanan: ${shortId(order.id)} - ${order.customerName}`,
          variant: "default"
        });
      }
    } else {
      // Open assign dialog if not occupied
      setSelectedRack(rack);
      setSelectedSlot(slot);
      setShowAssignDialog(true);
    }
  };

  // Function to remove an order from a slot
  const handleRemoveOrder = async (rack: Rack, slot: RackSlot) => {
    try {
      // Clear the slot in the database
      const { error } = await supabase
        .from('rack_slots')
        .update({
          occupied: false,
          order_id: null,
          assigned_at: null,
          due_date: null
        })
        .eq('id', slot.id);
        
      if (error) throw error;
      
      // Update local state
      const updatedRacks = racks.map(r => {
        if (r.id === rack.id) {
          const updatedSlots = r.slots.map(s => {
            if (s.id === slot.id) {
              return {
                ...s,
                occupied: false,
                order_id: undefined,
                assigned_at: undefined,
                due_date: undefined
              };
            }
            return s;
          });
          
          return {
            ...r,
            available_slots: r.available_slots + 1,
            slots: updatedSlots
          };
        }
        return r;
      });
      
      setRacks(updatedRacks);
      
      toast({
        title: "Slot dibebaskan",
        description: `Slot ${slot.position} di ${rack.name} telah dibebaskan.`,
        variant: "default"
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error("Error removing order:", error);
      toast({
        title: "Error removing order",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(date);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Fungsi untuk handle input form
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRackForm({ ...rackForm, [e.target.name]: e.target.value });
  };

  // Fungsi tambah rak
  const handleAddRack = async () => {
    setSaving(true);
    try {
      // Insert rack
      const { data: rackData, error: rackError } = await supabase
        .from("racks")
        .insert({
          name: rackForm.name,
          description: rackForm.description,
          total_slots: Number(rackForm.total_slots),
          available_slots: Number(rackForm.total_slots),
          business_id: businessId
        })
        .select()
        .single();
      if (rackError) throw rackError;
      // Generate slot positions (A1, A2, ...)
      const slots = Array.from({ length: Number(rackForm.total_slots) }, (_, i) => ({
        rack_id: rackData.id,
        position: `${rackForm.name[0].toUpperCase()}${i + 1}`,
        occupied: false,
        business_id: businessId
      }));
      // Insert slots
      const { error: slotError } = await supabase.from("rack_slots").insert(slots);
      if (slotError) throw slotError;
      setShowAddDialog(false);
      setRackForm({ name: "", description: "", total_slots: 1 });
      toast({ title: "Rak berhasil ditambahkan" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal tambah rak", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi edit rak
  const handleEditRack = (rack: Rack) => {
    setEditRack(rack);
    setRackForm({ name: rack.name, description: rack.description, total_slots: rack.total_slots });
    setShowEditDialog(true);
  };
  const handleUpdateRack = async () => {
    if (!editRack) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("racks")
        .update({
          name: rackForm.name,
          description: rackForm.description,
          total_slots: Number(rackForm.total_slots),
          business_id: businessId
        })
        .eq("id", editRack.id);
      if (error) throw error;
      setShowEditDialog(false);
      setEditRack(null);
      toast({ title: "Rak berhasil diupdate" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal update rak", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Fungsi hapus rak
  const handleDeleteRack = async (rack: Rack) => {
    if (!window.confirm(`Hapus rak ${rack.name}? Semua slot akan ikut terhapus!`)) return;
    setSaving(true);
    try {
      // Hapus slot dulu
      const { error: slotError } = await supabase.from("rack_slots").delete().eq("rack_id", rack.id);
      if (slotError) throw slotError;
      // Hapus rak
      const { error: rackError } = await supabase.from("racks").delete().eq("id", rack.id);
      if (rackError) throw rackError;
      toast({ title: "Rak berhasil dihapus" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Gagal hapus rak", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Helper untuk menyingkat UUID ke format ORD#xxxx (4 digit terakhir)
  const shortId = (id: string) => id ? `ORD#${id.substring(id.length - 4)}` : "-";

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Rak Penyimpanan</h1>
          <p className="text-muted-foreground">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Rak Penyimpanan</h1>
          <p className="text-muted-foreground">Kelola penempatan pesanan di rak penyimpanan laundry</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Rak
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ringkasan Rak</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Rak</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="text-right">Total Slot</TableHead>
                  <TableHead className="text-right">Slot Tersedia</TableHead>
                  <TableHead className="text-right">Persentase</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {racks.map(rack => (
                  <TableRow key={rack.id}>
                    <TableCell className="font-medium">{rack.name}</TableCell>
                    <TableCell>{rack.description}</TableCell>
                    <TableCell className="text-right">{rack.total_slots}</TableCell>
                    <TableCell className="text-right">{rack.available_slots}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={rack.available_slots > 0 ? "outline" : "destructive"}>
                        {Math.round((rack.available_slots / rack.total_slots) * 100)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEditRack(rack)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRack(rack)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          {racks.map(rack => (
            <Card key={rack.id} className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Archive className="mr-2 h-5 w-5" /> {rack.name}
                  </div>
                  <Badge variant={rack.available_slots > 0 ? "outline" : "destructive"}>
                    {rack.available_slots} dari {rack.total_slots} slot tersedia
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{rack.description}</p>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {rack.slots.map(slot => (
                    <div 
                      key={slot.id}
                      onClick={() => handleSlotClick(rack, slot)}
                      className={`
                        border p-2 rounded-md text-center cursor-pointer transition-colors
                        ${slot.occupied 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:border-primary/50'}
                      `}
                    >
                      <div className="font-medium">{slot.position}</div>
                      {slot.occupied ? (
                        <div className="mt-1">
                          <div className="text-xs truncate">{shortId(slot.order_id)}</div>
                          <div className="flex mt-1 justify-center">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOrder(rack, slot);
                              }}
                            >
                              ✓
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground mt-1">Kosong</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pesanan Menunggu Penempatan</CardTitle>
            </CardHeader>
            <CardContent>
              {availableOrders.length > 0 ? (
                <div className="space-y-3">
                  {availableOrders.map(order => (
                    <div key={order.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{shortId(order.id)}</p>
                          <p className="text-sm">{order.customerName}</p>
                        </div>
                        <Badge>{order.status === "ironing" ? "Disetrika" : "Siap Diambil"}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mb-2 opacity-50" />
                  <p>Semua pesanan telah ditempatkan</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Assign Order Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tempatkan Pesanan</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-1 mb-4">
              <p className="font-medium">Detail Slot:</p>
              <p>Rak: {selectedRack?.name}</p>
              <p>Posisi: {selectedSlot?.position}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="order-select">Pilih Pesanan</Label>
              <Select 
                value={selectedOrder} 
                onValueChange={setSelectedOrder}
              >
                <SelectTrigger id="order-select">
                  <SelectValue placeholder="Pilih pesanan untuk ditempatkan" />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders.map(order => (
                    <SelectItem key={order.id} value={order.id}>{shortId(order.id)} - {order.customerName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAssignDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleAssignOrder} disabled={!selectedOrder}>
              Tempatkan Pesanan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Tambah Rak */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Rak Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Nama Rak</Label>
            <input name="name" className="input input-bordered w-full" value={rackForm.name} onChange={handleFormChange} />
            <Label>Deskripsi</Label>
            <textarea name="description" className="input input-bordered w-full" value={rackForm.description} onChange={handleFormChange} />
            <Label>Jumlah Slot</Label>
            <input name="total_slots" type="number" min="1" className="input input-bordered w-full" value={rackForm.total_slots} onChange={handleFormChange} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddRack} disabled={saving || !rackForm.name || !rackForm.total_slots}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog Edit Rak */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rak</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Nama Rak</Label>
            <input name="name" className="input input-bordered w-full" value={rackForm.name} onChange={handleFormChange} />
            <Label>Deskripsi</Label>
            <textarea name="description" className="input input-bordered w-full" value={rackForm.description} onChange={handleFormChange} />
            <Label>Jumlah Slot</Label>
            <input name="total_slots" type="number" min="1" className="input input-bordered w-full" value={rackForm.total_slots} onChange={handleFormChange} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleUpdateRack} disabled={saving || !rackForm.name || !rackForm.total_slots}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RackManagement;
