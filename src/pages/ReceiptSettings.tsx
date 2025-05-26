import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TenantContext } from '@/contexts/TenantContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useFeature } from '@/hooks/useFeature';
import { Crown, ArrowLeft, Save, RefreshCw } from 'lucide-react';
import StrukPreview from '@/components/StrukPreview';

// Tipo para las configuraciones del recibo
interface ReceiptSettings {
  id?: string;
  business_id: string;
  header_text: string;
  footer_text: string;
  show_logo: boolean;
  show_address: boolean;
  show_phone: boolean;
  show_customer_info: boolean;
  show_cashier_name: boolean;
  custom_thank_you_message: string;
}

// Datos de ejemplo para la vista previa
const sampleOrder = {
  id: '12345678-1234-1234-1234-123456789012',
  customerName: 'Pelanggan Contoh',
  customerPhone: '081234567890',
  deliveryType: 'Datang Langsung',
  isPriority: 'Tidak',
  estimatedCompletion: '25 Mei 2025 14:00',
  cashierName: 'Kasir Demo',
  items: [
    { name: 'Cuci Setrika', quantity: 2, price: 15000 },
    { name: 'Dry Clean', quantity: 1, price: 25000 },
  ],
  subtotal: 55000,
  discount: 5000,
  total: 50000,
  amountReceived: 100000,
  change: 50000,
  status: 'completed',
  created_at: new Date().toISOString(),
};

const ReceiptSettings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || 'free';
  const { hasAccess, loading: featureLoading, refreshFeatureAccess } = useFeature('receipt_customization');
  
  // Forzar la actualización de la configuración de características al cargar la página
  useEffect(() => {
    refreshFeatureAccess();
  }, []);
  
  const [settings, setSettings] = useState<any>({
    show_logo: true,
    show_address: true,
    show_phone: true,
    show_customer_info: true,
    show_cashier_name: true,
    header_text: '',
    footer_text: '',
    custom_thank_you_message: '',
    show_qr_code: true,
    qr_code_url: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('header');
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  // Verificar acceso a la característica
  useEffect(() => {
    const checkAccess = async () => {
      // Esperar a que termine de cargar
      if (featureLoading) return;
      
      console.log('Verificando acceso a receipt_customization:', { hasAccess, tenantStatus });
      
      // Si no tiene acceso, mostrar mensaje y redirigir
      if (!hasAccess) {
        toast({
          title: "Fitur Terbatas",
          description: "Fitur kustomisasi struk tidak tersedia untuk akun Anda. Hubungi admin untuk informasi lebih lanjut.",
          variant: "destructive"
        });
        navigate('/settings');
      }
    };
    
    checkAccess();
  }, [hasAccess, featureLoading, navigate, toast, tenantStatus]);
  
  // Fungsi untuk upload gambar ke Supabase Storage
  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from("images").upload(`${folder}/${fileName}`, file, { upsert: true });
    if (error) throw error;
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("images").getPublicUrl(`${folder}/${fileName}`);
    return publicUrlData.publicUrl;
  };

  // Fungsi untuk handle perubahan file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "qr_code") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (type === "qr_code") {
      setQrCodeFile(file);
      // Tampilkan preview QR code
      setQrCodePreview(URL.createObjectURL(file));
    }
  };
  
  // Cargar configuraciones existentes
  useEffect(() => {
    const fetchSettings = async () => {
      if (!tenant?.id) return;
      
      setLoading(true);
      try {
        // Usar any para evitar errores de tipo ya que la tabla es nueva
        const { data, error } = await supabase
          .from('receipt_settings' as any)
          .select('*')
          .eq('business_id', tenant.id)
          .single();
        
        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        
        if (data) {
          setSettings(data);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: `Gagal memuat pengaturan: ${error.message}`,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [tenant?.id, toast]);
  
  // Guardar configuraciones
  const handleSave = async () => {
    if (!tenant?.id) return;
    
    setSaving(true);
    try {
      // Upload QR code jika ada
      let qrCodeUrl = settings.qr_code_url;
      if (qrCodeFile) {
        qrCodeUrl = await uploadImage(qrCodeFile, 'qr_codes');
      }
      
      let query;
      
      // Verificar si ya existe una configuración
      const { data: existingSettings, error: settingsError } = await supabase
        .from('receipt_settings' as any)
        .select('id')
        .eq('business_id', tenant.id)
        .single();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }
      
      if (existingSettings && 'id' in existingSettings) {
        // Actualizar configuración existente
        query = supabase
          .from('receipt_settings' as any)
          .update({
            ...settings,
            qr_code_url: qrCodeUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSettings.id);
      } else {
        // Crear nueva configuración
        query = supabase
          .from('receipt_settings' as any)
          .insert({
            ...settings,
            qr_code_url: qrCodeUrl,
            business_id: tenant.id,
          });
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      // Update settings dengan URL QR code baru
      setSettings(prev => ({
        ...prev,
        qr_code_url: qrCodeUrl
      }));
      
      // Reset file state
      setQrCodeFile(null);
      
      toast({
        title: 'Berhasil',
        description: 'Pengaturan struk berhasil disimpan',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Gagal menyimpan pengaturan: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Restablecer a valores predeterminados
  const handleReset = () => {
    setSettings({
      business_id: tenant?.id || '',
      header_text: '',
      footer_text: '',
      show_logo: true,
      show_address: true,
      show_phone: true,
      show_customer_info: true,
      show_cashier_name: true,
      custom_thank_you_message: 'Terima kasih atas kunjungan Anda',
    });
    
    toast({
      title: 'Reset',
      description: 'Pengaturan dikembalikan ke default',
    });
  };
  
  return (
    <div className="container px-4 py-4 mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Pengaturan Struk</h1>
          {tenantStatus === 'premium' && (
            <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold flex items-center">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={loading || saving}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading || saving}>
            {saving ? 'Menyimpan...' : (
              <>
                <Save className="h-3.5 w-3.5 mr-1" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Panel de configuración */}
        <div className="md:col-span-8">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Kustomisasi Struk</CardTitle>
              <CardDescription className="text-xs">
                Sesuaikan tampilan struk sesuai kebutuhan bisnis Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-3 w-full">
                  <TabsTrigger value="header" className="text-xs py-1.5">Header</TabsTrigger>
                  <TabsTrigger value="content" className="text-xs py-1.5">Konten</TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs py-1.5">Footer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="header" className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="show_logo" className="text-sm">Tampilkan Logo</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Tampilkan logo bisnis Anda di struk
                      </span>
                      <Switch
                        id="show_logo"
                        checked={settings.show_logo}
                        onCheckedChange={(checked) => setSettings({...settings, show_logo: checked})}
                      />
                    </div>
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="header_text" className="text-sm">Teks Header Tambahan</Label>
                    <Textarea
                      id="header_text"
                      placeholder="Contoh: Buka Setiap Hari 08.00 - 20.00"
                      value={settings.header_text}
                      onChange={(e) => setSettings({...settings, header_text: e.target.value})}
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Teks ini akan ditampilkan di bawah nama bisnis
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="show_address">Tampilkan Alamat</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tampilkan alamat bisnis di struk
                      </span>
                      <Switch
                        id="show_address"
                        checked={settings.show_address}
                        onCheckedChange={(checked) => setSettings({...settings, show_address: checked})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="show_phone">Tampilkan No. Telepon</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tampilkan nomor telepon bisnis di struk
                      </span>
                      <Switch
                        id="show_phone"
                        checked={settings.show_phone}
                        onCheckedChange={(checked) => setSettings({...settings, show_phone: checked})}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="content" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="show_customer_info">Tampilkan Info Pelanggan</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tampilkan informasi pelanggan (nama, telepon, dll.)
                      </span>
                      <Switch
                        id="show_customer_info"
                        checked={settings.show_customer_info}
                        onCheckedChange={(checked) => setSettings({...settings, show_customer_info: checked})}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="show_cashier_name">Tampilkan Nama Kasir</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Tampilkan nama kasir yang melayani transaksi
                      </span>
                      <Switch
                        id="show_cashier_name"
                        checked={settings.show_cashier_name}
                        onCheckedChange={(checked) => setSettings({...settings, show_cashier_name: checked})}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="footer" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_thank_you_message">Pesan Terima Kasih</Label>
                    <Textarea
                      id="custom_thank_you_message"
                      placeholder="Contoh: Terima kasih atas kunjungan Anda"
                      value={settings.custom_thank_you_message}
                      onChange={(e) => setSettings({...settings, custom_thank_you_message: e.target.value})}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500">
                      Pesan yang ditampilkan di bagian bawah struk
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="footer_text">Teks Footer Tambahan</Label>
                    <Textarea
                      id="footer_text"
                      placeholder="Contoh: Ikuti kami di Instagram @laundry_anda"
                      value={settings.footer_text}
                      onChange={(e) => setSettings({...settings, footer_text: e.target.value})}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500">
                      Teks tambahan yang akan ditampilkan di bagian bawah struk
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label htmlFor="show_qr_code">Tampilkan QR Code</Label>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Tampilkan QR code di bagian bawah struk
                      </span>
                      <Switch
                        id="show_qr_code"
                        checked={settings.show_qr_code}
                        onCheckedChange={(checked) => setSettings({...settings, show_qr_code: checked})}
                      />
                    </div>
                  </div>
                  
                  {settings.show_qr_code && (
                    <div className="space-y-2">
                      <Label htmlFor="qr_code">Upload QR Code</Label>
                      <Input
                        id="qr_code"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, "qr_code")}
                      />
                      
                      {(qrCodePreview || settings.qr_code_url) && (
                        <div className="mt-2 border p-2 rounded">
                          <img
                            src={qrCodePreview || settings.qr_code_url}
                            alt="QR Code Preview"
                            className="h-32 mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Vista previa */}
        <div className="md:col-span-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Preview Struk</CardTitle>
              <CardDescription className="text-xs">
                Tampilan struk dengan pengaturan saat ini
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="bg-gray-100 p-2 rounded-b-lg" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <div className="bg-white p-3 rounded shadow-sm mx-auto" style={{ maxWidth: '240px' }}>
                  {/* Header */}
                  <div className="text-center mb-2">
                    {settings.show_logo && tenant?.status === 'premium' && (
                      <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2 flex items-center justify-center text-gray-400 text-xs">
                        Logo
                      </div>
                    )}
                    <div className="font-bold text-base">{tenant?.businessName || 'Nama Bisnis'}</div>
                    {settings.header_text && (
                      <div className="text-xs">{settings.header_text}</div>
                    )}
                    {settings.show_address && (
                      <div className="text-xs">{tenant?.address || 'Alamat Bisnis'}</div>
                    )}
                    {settings.show_phone && (
                      <div className="text-xs">Telp: {tenant?.phone || '08123456789'}</div>
                    )}
                    <div className="border-b border-dashed border-gray-400 my-1.5"></div>
                  </div>
                  
                  {/* Info Pelanggan */}
                  {settings.show_customer_info && (
                    <div className="mb-2">
                      <div className="text-xs">Nama: {sampleOrder.customerName}</div>
                      <div className="text-xs">No HP: {sampleOrder.customerPhone}</div>
                      <div className="text-xs">Jemput/Antar: {sampleOrder.deliveryType}</div>
                      <div className="text-xs">Prioritas: {sampleOrder.isPriority}</div>
                      <div className="text-xs">Estimasi: {sampleOrder.estimatedCompletion}</div>
                      <div className="border-b border-dashed border-gray-400 my-1.5"></div>
                    </div>
                  )}
                  
                  <div className="mb-2">
                    <div className="text-xs">No: ORD#{sampleOrder.id.slice(-4)}</div>
                    {settings.show_cashier_name && (
                      <div className="text-xs">Kasir: {sampleOrder.cashierName}</div>
                    )}
                    <div className="border-b border-dashed border-gray-400 my-1.5"></div>
                  </div>
                  
                  {/* Items */}
                  <div className="mb-2">
                    <div className="flex justify-between mb-1 text-xs font-semibold">
                      <span>Item</span>
                      <span>Qty</span>
                      <span>Harga</span>
                    </div>
                    <div className="border-b border-dashed border-gray-400 mb-1.5"></div>
                    
                    {sampleOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between mb-1 text-xs">
                        <span className="flex-1">{item.name}</span>
                        <span className="w-6 text-right">{item.quantity}</span>
                        <span className="w-14 text-right">
                          {item.price.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="border-b border-dashed border-gray-400 my-1.5"></div>
                  <div className="mb-2 text-xs">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{sampleOrder.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                    {sampleOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span>Diskon:</span>
                        <span>{sampleOrder.discount.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{sampleOrder.total.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bayar:</span>
                      <span>{sampleOrder.amountReceived.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kembali:</span>
                      <span>{sampleOrder.change.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="text-center mt-3 text-xs">
                    <div>{settings.custom_thank_you_message}</div>
                    {settings.footer_text && (
                      <div className="mt-1">{settings.footer_text}</div>
                    )}
                    {tenant?.status === 'premium' && settings.show_qr_code && (
                      <div className="mt-2">
                        <div>Scan untuk rating & review</div>
                        {settings.qr_code_url ? (
                          <img 
                            src={settings.qr_code_url} 
                            alt="QR Code" 
                            className="w-20 h-20 mx-auto mt-1 object-contain"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded mx-auto mt-1 flex items-center justify-center text-gray-400 text-xs">
                            QR Code
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;
