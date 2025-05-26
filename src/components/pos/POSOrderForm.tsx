import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Package } from "lucide-react";
import { Product } from "@/models/Product";
import { Service } from "@/models/Service";
import { useToast } from "@/components/ui/use-toast";

interface POSOrderFormProps {
  onAddToCart: (item: any) => void;
  products: Product[];
  services: Service[];
  loading?: boolean;
  onUpdateStock?: (productId: string, quantity: number) => Promise<void>;
  checkProductStock?: (productId: string, quantity: number) => Promise<boolean>;
  hasReachedPosLimit?: boolean;
}

export function POSOrderForm({ 
  onAddToCart, 
  products, 
  services = [], 
  loading = false,
  onUpdateStock,
  checkProductStock,
  hasReachedPosLimit = false
}: POSOrderFormProps) {
  const [activeTab, setActiveTab] = useState("services");
  const [selectedService, setSelectedService] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const handleAddServiceToCart = () => {
    const service = services.find(s => s.id === selectedService);
    if (!service) return;

    // Validasi quantity untuk layanan
    const quantityNum = parseFloat(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        title: "Jumlah tidak valid",
        description: "Masukkan jumlah yang valid (minimal 0.1)",
        variant: "destructive"
      });
      return;
    }

    onAddToCart({
      id: service.id,
      name: service.name,
      price: service.price,
      quantity: quantityNum,
      notes: notes,
      unit: service.unit || 'kg'
    });
    setSelectedService("");
    setQuantity("1");
    setNotes("");
  };

  const handleAddProductToCart = async () => {
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;
    
    // Validasi quantity untuk produk
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      toast({
        title: "Jumlah tidak valid",
        description: "Masukkan jumlah yang valid (minimal 1)",
        variant: "destructive"
      });
      return;
    }

    // Validasi stok - gunakan stock_quantity_display jika ada
    const availableStock = product.stock_quantity_display !== undefined ? product.stock_quantity_display : product.stock_quantity;
    
    if (quantityNum > availableStock) {
      toast({
        title: "Stok tidak mencukupi",
        description: `Stok tersedia: ${availableStock}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Hanya memeriksa ketersediaan stok tanpa menguranginya
      if (checkProductStock) {
        await checkProductStock(product.id, quantityNum);
      }

      onAddToCart({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: quantityNum,
        notes: notes,
        isProduct: true
      });
      
      // Reset form
      setSelectedProduct("");
      setQuantity("1");
      setNotes("");
    } catch (error: any) {
      toast({
        title: "Gagal menambah ke keranjang",
        description: error.message || "Terjadi kesalahan saat menambah ke keranjang",
        variant: "destructive"
      });
    }
  };

  // Filter services dan products sesuai pencarian
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
      <CardContent className="p-4">
        <div className="mb-2">
          <Input
            placeholder="Cari layanan/produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 text-sm px-2"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="services">Layanan</TabsTrigger>
            <TabsTrigger value="products">Produk</TabsTrigger>
          </TabsList>
          
          <TabsContent value="services" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredServices.map(service => (
                <Card
                  key={service.id}
                  className={`cursor-pointer hover:border-orange-500 transition-colors p-2 ${selectedService === service.id ? 'border-orange-500' : ''}`}
                  onClick={() => setSelectedService(service.id)}
                >
                  <CardContent className="p-2">
                    <h3 className="font-semibold text-xs truncate">{service.name}</h3>
                    <p className="text-[11px] text-gray-500">Rp {service.price.toLocaleString("id-ID")}/{service.unit || 'kg'}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedService && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="service-quantity">Jumlah (kg)</Label>
                  <Input
                    id="service-quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Contoh: 1.5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="service-notes">Catatan</Label>
                  <Textarea
                    id="service-notes"
                    placeholder="Tambahkan catatan khusus..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleAddServiceToCart}
                  disabled={hasReachedPosLimit}
                  title={hasReachedPosLimit ? "Batas penggunaan POS tercapai" : undefined}
                >
                  {hasReachedPosLimit ? "Batas Tercapai" : "Lanjutkan"}
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {filteredProducts.map(product => (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:border-orange-500 transition-colors p-2 ${selectedProduct === product.id ? 'border-orange-500' : ''} ${(product.stock_quantity_display !== undefined ? product.stock_quantity_display : product.stock_quantity) < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => (product.stock_quantity_display !== undefined ? product.stock_quantity_display : product.stock_quantity) > 0 && setSelectedProduct(product.id)}
                >
                  <CardContent className="p-2">
                    <h3 className="font-semibold text-xs truncate">{product.name}</h3>
                    <p className="text-[11px] text-gray-500">Rp {product.price.toLocaleString("id-ID")}/{product.unit}</p>
                    <p className="text-[10px] text-gray-400">Stok: {product.stock_quantity_display !== undefined ? product.stock_quantity_display : product.stock_quantity}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedProduct && (
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="product-quantity">Jumlah</Label>
                  <Input
                    id="product-quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const product = products.find(p => p.id === selectedProduct);
                      if (product && parseInt(newValue) > product.stock_quantity) {
                        setQuantity(product.stock_quantity.toString());
                      } else {
                        setQuantity(newValue);
                      }
                    }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="product-notes">Catatan</Label>
                  <Textarea
                    id="product-notes"
                    placeholder="Tambahkan catatan khusus..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleAddProductToCart}
                  disabled={hasReachedPosLimit}
                  title={hasReachedPosLimit ? "Batas penggunaan POS tercapai" : undefined}
                >
                  {hasReachedPosLimit ? "Batas Tercapai" : "Lanjutkan"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
  );
}
