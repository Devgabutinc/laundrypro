import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag, Clock, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TenantContext } from "@/contexts/TenantContext";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
  unit?: string; // Add unit property for services (e.g., 'kg')
}

interface POSCartProps {
  items: CartItem[];
  customer: {
    name: string;
    phone: string;
  };
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
  onSaveForLater: () => void;
  onUpdateCartOptions: (options: CartOptions) => void;
  cartOptions: CartOptions;
  hasReachedPosLimit?: boolean;
  posUsageCount?: number;
  posUsageLimit?: number;
}

interface CartOptions {
  pickupType: string;
  estimate: string;
  priority: boolean;
  rackLocation?: string;
}

// Helper function to check if user can access a feature based on tenant status
function canAccessFeature(featureName: string, tenantStatus: string, featureSettings: any[]): boolean {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

export function POSCart({ 
  items, 
  customer,
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  onSaveForLater,
  onUpdateCartOptions,
  cartOptions,
  hasReachedPosLimit = false,
  posUsageCount = 0,
  posUsageLimit = 0
}: POSCartProps) {
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const { toast } = useToast();
  const { businessId } = useAuth();
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";
  
  // State untuk data slot rak dan feature settings
  const [slots, setSlots] = useState<{id: string, name: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [featureSettings, setFeatureSettings] = useState<any[]>([]);
  const [featureSettingsLoaded, setFeatureSettingsLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchSlots = async () => {
      if (!businessId) return;
      setLoadingSlots(true);
      // @ts-expect-error
      const { data, error } = (await supabase
        .from('rack_slots')
        .select('id, position, rack_id, occupied, racks(name)')
        .eq('business_id', businessId)
        .eq('occupied', false)
        .order('position')) as any;
      if (!error && data && !ignore) {
        // Gabungkan nama rak dan posisi
        const slotList = data.map((slot: any) => ({
          id: slot.id,
          name: `${slot.racks?.name || ''} ${slot.position}`.trim()
        }));
        setSlots(slotList);
      }
      setLoadingSlots(false);
    };
    fetchSlots();
    return () => { ignore = true; };
  }, [businessId]);
  
  // Fetch feature settings
  useEffect(() => {
    const fetchFeatureSettings = async () => {
      const { data, error } = await supabase
        .from("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) {
        setFeatureSettings(data);
      }
      setFeatureSettingsLoaded(true);
    };
    fetchFeatureSettings();
  }, []);
  
  // Check if user can access racks feature
  const canUseRacks = tenantStatus === "premium" || canAccessFeature("racks", tenantStatus, featureSettings);

  const handleSaveForLater = () => {
    if (!customer?.name || !customer?.phone) {
      toast({
        title: "Data Tidak Lengkap",
        description: "Silakan lengkapi data pelanggan terlebih dahulu.",
        variant: "destructive"
      });
      return;
    }
    onSaveForLater();
  };

  return (
    <Card>
      <CardContent>
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <Label>jenis pickup Jemput/Antar 
              </Label>
              <Select 
                value={cartOptions.pickupType} 
                onValueChange={(value) => onUpdateCartOptions({...cartOptions, pickupType: value})}
                className="w-full"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih jenis pengiriman" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer_come">Customer Datang Langsung</SelectItem>
                  <SelectItem value="pickup_delivery">Dijemput & Diantar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimasi Pengerjaan</Label>
              <Select 
                value={cartOptions.estimate} 
                onValueChange={(value) => onUpdateCartOptions({...cartOptions, estimate: value})}
                className="w-full"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih estimasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Jam</SelectItem>
                  <SelectItem value="2">2 Jam</SelectItem>
                  <SelectItem value="3">3 Jam</SelectItem>
                  <SelectItem value="6">6 Jam</SelectItem>
                  <SelectItem value="12">12 Jam</SelectItem>
                  <SelectItem value="24">24 Jam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="priority" 
              checked={cartOptions.priority}
              onCheckedChange={(checked) => onUpdateCartOptions({...cartOptions, priority: checked})}
            />
            <Label htmlFor="priority">Prioritas</Label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Pilih Slot Rak</Label>
              {!canUseRacks && (
                <div className="flex items-center text-xs text-amber-600">
                  <Lock className="h-3 w-3 mr-1" />
                  <span>Fitur Premium</span>
                </div>
              )}
            </div>
            <Select
              value={cartOptions.rackLocation || ''}
              onValueChange={(value) => onUpdateCartOptions({...cartOptions, rackLocation: value})}
              disabled={loadingSlots || !canUseRacks}
            >
              <SelectTrigger>
                {!canUseRacks ? (
                  <SelectValue placeholder="Upgrade ke Premium" />
                ) : (
                  <SelectValue placeholder={loadingSlots ? 'Memuat slot...' : 'Pilih slot rak'} />
                )}
              </SelectTrigger>
              <SelectContent>
                {!canUseRacks ? (
                  <SelectItem value="premium_required" disabled>
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      <span>Upgrade ke Premium untuk menggunakan fitur ini</span>
                    </div>
                  </SelectItem>
                ) : (
                  <>
                    {slots.map(slot => (
                      <SelectItem key={slot.id} value={slot.id}>{slot.name}</SelectItem>
                    ))}
                    {(!loadingSlots && slots.length === 0) && (
                      <SelectItem value="no_slot" disabled>Tidak ada slot tersedia</SelectItem>
                    )}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ShoppingBag className="mx-auto h-12 w-12 mb-2" />
            <p>Keranjang belanja kosong</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex justify-between border-b pb-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-500">
                      Rp {item.price.toLocaleString("id-ID")} x {item.quantity}
                    </p>
                    {item.notes && (
                      <p className="text-xs text-gray-400 mt-1">{item.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-r-none"
                        onClick={() => {
                          // Determine if this is a service (has decimal) or product (integer)
                          const isService = !Number.isInteger(item.quantity) || item.unit === 'kg';
                          
                          if (isService) {
                            // For services, always use decimal increments
                            // Ensure minimum value is 0.1 and always round to 1 decimal place
                            const newQuantity = Math.max(0.1, parseFloat((item.quantity - 0.1).toFixed(1)));
                            onUpdateQuantity(index, newQuantity);
                          } else {
                            // For products, use integer increments
                            onUpdateQuantity(index, Math.max(1, item.quantity - 1));
                          }
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="h-8 px-2 flex items-center justify-center border-t border-b">
                        {/* Always show decimal place for services */}
                        {!Number.isInteger(item.quantity) || item.unit === 'kg' 
                          ? parseFloat(item.quantity.toString()).toFixed(1) 
                          : item.quantity}
                      </span>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => {
                          // Determine if this is a service (has decimal) or product (integer)
                          const isService = !Number.isInteger(item.quantity) || item.unit === 'kg';
                          
                          if (isService) {
                            // For services, always use decimal increments
                            // Always round to 1 decimal place to avoid floating point issues
                            const newQuantity = parseFloat((item.quantity + 0.1).toFixed(1));
                            onUpdateQuantity(index, newQuantity);
                          } else {
                            // For products, use integer increments
                            onUpdateQuantity(index, item.quantity + 1);
                          }
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="flex-col space-y-4 pt-4 border-t">
        <div className="w-full flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>Rp {totalAmount.toLocaleString("id-ID")}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button 
            variant="outline"
            className="w-full" 
            size="lg"
            onClick={handleSaveForLater}
            disabled={items.length === 0 || hasReachedPosLimit}
            title={hasReachedPosLimit ? `Batas penggunaan POS tercapai (${posUsageCount}/${posUsageLimit})` : undefined}
          >
            {hasReachedPosLimit ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Batas Tercapai
              </>
            ) : (
              <>
                <Clock className="mr-2 h-4 w-4" />
                Bayar Nanti
              </>
            )}
          </Button>
          <Button 
            className="w-full" 
            size="lg" 
            disabled={items.length === 0 || hasReachedPosLimit}
            onClick={onCheckout}
            title={hasReachedPosLimit ? `Batas penggunaan POS tercapai (${posUsageCount}/${posUsageLimit})` : undefined}
          >
            {hasReachedPosLimit ? (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Batas Tercapai
              </>
            ) : (
              <>Bayar Sekarang</>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
