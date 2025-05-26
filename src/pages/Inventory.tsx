import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Search, ArrowUpDown, AlertTriangle, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { InventoryForm } from "@/components/inventory/InventoryForm";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/models/Product";
import { useAuth } from "@/hooks/useAuth";
import { Service } from "@/models/Service";

const Inventory = () => {
  const { toast } = useToast();
  const { session, businessId } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortField, setSortField] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'produk' | 'jasa'>("produk");
  const [services, setServices] = useState<Service[]>([]);
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: "", description: "", price: "", category: "", unit: "kg" });
  const [loadingServices, setLoadingServices] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showEditProductForm, setShowEditProductForm] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [showEditServiceForm, setShowEditServiceForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Load products from Supabase
  const fetchProducts = async () => {
    if (!session || !businessId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order(sortField, { ascending: sortDirection === 'asc' });
        
      if (error) throw error;
      
      setProducts(data || []);
    } catch (err: any) {
      toast({
        title: "Error fetching products",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [session, sortField, sortDirection, businessId]);
  
  // Cek apakah perlu me-refresh data produk (setelah perubahan stok di POS)
  useEffect(() => {
    const checkInventoryRefresh = () => {
      const needsRefresh = localStorage.getItem('inventory_needs_refresh');
      
      if (needsRefresh === 'true') {
        // Reset flag
        localStorage.removeItem('inventory_needs_refresh');
        // Refresh data produk
        fetchProducts();
      }
    };
    
    // Cek saat komponen dimuat
    checkInventoryRefresh();
    
    // Cek saat window mendapatkan fokus (misalnya setelah kembali dari halaman POS)
    const handleFocus = () => checkInventoryRefresh();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter and sort products
  useEffect(() => {
    let filtered = [...products];
    
    // Apply category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          (product.description || '').toLowerCase().includes(query) ||
          product.id.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  }, [searchQuery, categoryFilter, products]);

  // Handle adding a new product
  const handleAddProduct = async (productData: Omit<Product, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          stock_quantity: productData.stock_quantity,
          unit: productData.unit,
          business_id: businessId,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      setProducts([data, ...products]);
      setShowAddForm(false);
      
      toast({
        title: "Produk Ditambahkan",
        description: `${data.name} berhasil ditambahkan ke inventaris.`,
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: "Error adding product",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Handle stock update
  const handleUpdateStock = async (productId: string, change: number) => {
    try {
      // First, get the current product
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('id', productId)
        .single();
        
      if (fetchError) throw fetchError;
      
      const newQuantity = product.stock_quantity + change;
      if (newQuantity < 0) {
        toast({
          title: "Stok Tidak Mencukupi",
          description: "Jumlah stok tidak dapat kurang dari 0.",
          variant: "destructive"
        });
        return;
      }
      
      // Update the stock quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
        
      if (updateError) throw updateError;
      
      // Update local state
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, stock_quantity: newQuantity, updated_at: new Date().toISOString() } 
          : p
      ));
      
      toast({
        title: "Stok Diperbarui",
        description: `Stok produk berhasil diperbarui.`,
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: "Error updating stock",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // Handle sort toggle
  const toggleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get unique categories for filter
  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  // Fetch services dari Supabase
  const fetchServices = async () => {
    if (!session || !businessId) return;
    try {
      setLoadingServices(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      toast({ title: 'Error fetching services', description: err.message, variant: 'destructive' });
    } finally {
      setLoadingServices(false);
    }
  };

  // Fetch services saat tab jasa aktif
  useEffect(() => {
    if (activeTab === 'jasa') fetchServices();
  }, [activeTab, session, businessId]);

  // Handler tambah jasa ke Supabase
  const handleAddService = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert({
          name: serviceForm.name,
          description: serviceForm.description,
          price: Number(serviceForm.price),
          category: serviceForm.category,
          unit: serviceForm.unit,
          business_id: businessId,
        })
        .select()
        .single();
      if (error) throw error;
      setServices([data, ...services]);
      setShowAddServiceForm(false);
      setServiceForm({ name: '', description: '', price: '', category: '', unit: 'kg' });
      toast({ title: 'Jasa Ditambahkan', description: `${data.name} berhasil ditambahkan ke daftar jasa.` });
    } catch (err: any) {
      toast({ title: 'Error tambah jasa', description: err.message, variant: 'destructive' });
    }
  };

  const handleEditProduct = async (productData: Omit<Product, "id" | "created_at" | "updated_at">) => {
    if (!editProduct) return;
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...productData, updated_at: new Date().toISOString() })
        .eq('id', editProduct.id)
        .select()
        .single();
      if (error) throw error;
      setProducts(products.map(p => p.id === editProduct.id ? data : p));
      setShowEditProductForm(false);
      setEditProduct(null);
      toast({ title: 'Produk Diperbarui', description: `${data.name} berhasil diperbarui.` });
    } catch (err: any) {
      toast({ title: 'Error edit produk', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus produk ini?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
      toast({ title: 'Produk Dihapus', description: 'Produk berhasil dihapus.' });
    } catch (err: any) {
      toast({ title: 'Error hapus produk', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const handleEditService = async () => {
    if (!editService) return;
    try {
      const { data, error } = await supabase
        .from('services')
        .update({
          name: serviceForm.name,
          description: serviceForm.description,
          price: Number(serviceForm.price),
          category: serviceForm.category,
          unit: serviceForm.unit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editService.id)
        .select()
        .single();
      if (error) throw error;
      setServices(services.map(s => s.id === editService.id ? data : s));
      setShowEditServiceForm(false);
      setEditService(null);
      toast({ title: 'Jasa Diperbarui', description: `${data.name} berhasil diperbarui.` });
    } catch (err: any) {
      toast({ title: 'Error edit jasa', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus jasa ini?')) return;
    setDeleting(id);
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
      setServices(services.filter(s => s.id !== id));
      toast({ title: 'Jasa Dihapus', description: 'Jasa berhasil dihapus.' });
    } catch (err: any) {
      toast({ title: 'Error hapus jasa', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
      <div>
        <h1 className="text-2xl font-bold">Inventaris</h1>
        <p className="text-muted-foreground">
          Kelola stok barang dan bahan untuk laundry
        </p>
      </div>

      {/* Actions toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'produk' ? "Cari produk..." : "Cari jasa..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select 
          value={categoryFilter} 
          onValueChange={setCategoryFilter}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter Kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category} className="capitalize">
                {category === "all" ? "Semua Kategori" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {activeTab === 'produk' ? (
          <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <InventoryForm onSubmit={handleAddProduct} />
            </DialogContent>
          </Dialog>
        ) : (
          <Button onClick={() => setShowAddServiceForm(true)}>
            <Plus className="mr-2 h-4 w-4" /> Tambah Jasa
          </Button>
        )}
      </div>

      {/* Tabs Produk & Jasa */}
      <div className="flex gap-2 mb-4">
        <Button variant={activeTab === "produk" ? "default" : "outline"} onClick={() => setActiveTab("produk")}>Produk</Button>
        <Button variant={activeTab === "jasa" ? "default" : "outline"} onClick={() => setActiveTab("jasa")}>Jasa</Button>
      </div>

      {/* Tab Produk */}
      {activeTab === "produk" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Daftar Produk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead onClick={() => toggleSort("name")} className="cursor-pointer">
                      Nama <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Kategori</TableHead>
                    <TableHead onClick={() => toggleSort("price")} className="text-right cursor-pointer">
                      Harga <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead onClick={() => toggleSort("stock_quantity")} className="text-center cursor-pointer">
                      Stok <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </TableHead>
                    <TableHead className="w-[100px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        Loading products...
                      </TableCell>
                    </TableRow>
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{typeof product.id === 'string' && product.id.substring(0, 8)}</TableCell>
                        <TableCell>
                          <div>
                            <div>{product.name}</div>
                            <div className="text-sm text-muted-foreground hidden md:block">{product.description}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell capitalize">
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          Rp {product.price.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className={product.stock_quantity < 5 ? "text-red-500 font-medium" : ""}>
                              {product.stock_quantity} {product.unit}
                            </span>
                            {product.stock_quantity < 5 && (
                              <span className="text-xs text-red-500 flex items-center">
                                <AlertTriangle className="h-3 w-3 mr-1" /> Stok rendah
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStock(product.id, 1)}>+</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStock(product.id, -1)}>-</Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditProduct(product); setShowEditProductForm(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)} disabled={deleting === product.id}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        <div className="flex flex-col items-center">
                          <Package className="h-8 w-8 text-muted-foreground mb-2" />
                          <p>Tidak ada produk yang ditemukan</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Jasa */}
      {activeTab === "jasa" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Daftar Jasa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Deskripsi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingServices ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">
                        Loading services...
                      </TableCell>
                    </TableRow>
                  ) : services.length > 0 ? services.map(service => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.id.substring(0,8)}</TableCell>
                      <TableCell>{service.name}</TableCell>
                      <TableCell>{service.category}</TableCell>
                      <TableCell>Rp {service.price.toLocaleString("id-ID")} / {service.unit || 'kg'}</TableCell>
                      <TableCell>{service.unit || 'kg'}</TableCell>
                      <TableCell>{service.description}</TableCell>
                      <TableCell>
                        <div className="flex justify-end space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditService(service); setServiceForm({ name: service.name, description: service.description || '', price: service.price, category: service.category, unit: service.unit || 'kg' }); setShowEditServiceForm(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteService(service.id)} disabled={deleting === service.id}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6">Belum ada jasa</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          {/* Form Tambah Jasa */}
          <Dialog open={showAddServiceForm} onOpenChange={setShowAddServiceForm}>
            <DialogContent className="sm:max-w-[500px]">
              <div className="py-2">
                <div className="mb-4">
                  <h2 className="text-lg font-bold">Tambah Jasa</h2>
                  <p className="text-sm text-muted-foreground">Masukkan detail jasa dan klik simpan ketika selesai.</p>
                </div>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label htmlFor="service-name" className="font-medium">Nama Jasa</label>
                    <Input id="service-name" placeholder="Masukkan nama jasa" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="service-category" className="font-medium">Kategori</label>
                    <Input id="service-category" placeholder="Masukkan kategori jasa" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="service-price" className="font-medium">Harga (Rp)</label>
                      <Input 
                        id="service-price" 
                        type="text" 
                        placeholder="Harga jasa" 
                        value={serviceForm.price} 
                        onChange={e => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          setServiceForm({ ...serviceForm, price: value });
                        }} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="service-unit" className="font-medium">Satuan</label>
                      <Select value={serviceForm.unit || 'kg'} onValueChange={val => setServiceForm({ ...serviceForm, unit: val })}>
                        <SelectTrigger id="service-unit" className="w-full">
                          <SelectValue placeholder="Pilih satuan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="pcs">pcs</SelectItem>
                          <SelectItem value="meter">meter</SelectItem>
                          <SelectItem value="liter">liter</SelectItem>
                          <SelectItem value="lembar">lembar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="service-description" className="font-medium">Deskripsi</label>
                    <Input id="service-description" placeholder="Deskripsi jasa (opsional)" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={handleAddService} disabled={!serviceForm.name || serviceForm.price === ''}>Simpan</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </Card>
      )}

      <Dialog open={showEditProductForm} onOpenChange={setShowEditProductForm}>
        <DialogContent className="sm:max-w-[500px]">
          <InventoryForm onSubmit={handleEditProduct} product={editProduct!} />
        </DialogContent>
      </Dialog>

      <Dialog open={showEditServiceForm} onOpenChange={setShowEditServiceForm}>
        <DialogContent className="sm:max-w-[500px]">
          <CardTitle>Edit Jasa</CardTitle>
          <div className="space-y-2 py-2">
            <Input placeholder="Nama Jasa" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })} />
            <Input placeholder="Kategori" value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })} />
            <Input 
              placeholder="Harga" 
              type="text" 
              value={serviceForm.price} 
              onChange={e => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setServiceForm({ ...serviceForm, price: value });
              }} 
            />
            <Select value={serviceForm.unit || 'kg'} onValueChange={val => setServiceForm({ ...serviceForm, unit: val })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Satuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="pcs">pcs</SelectItem>
                <SelectItem value="meter">meter</SelectItem>
                <SelectItem value="liter">liter</SelectItem>
                <SelectItem value="lembar">lembar</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Deskripsi" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })} />
          </div>
          <Button onClick={handleEditService} disabled={!serviceForm.name || serviceForm.price === ''}>Simpan</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
