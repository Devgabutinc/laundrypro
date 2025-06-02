import { useState, useEffect, useContext } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFeature } from '@/hooks/useFeature';
import { convertImageToEscposBytes } from '@/utils/convertImageToEscposBytes';
import { TenantContext } from '@/contexts/TenantContext';

// Declare bluetoothSerial for TypeScript
declare var bluetoothSerial: any;

// Declare global untuk window.plugins
declare global {
  interface Window {
    plugins?: any;
  }
}

// Format currency helper
const formatCurrency = (amount: number): string => {
  // Gunakan format manual untuk menghindari karakter aneh pada printer thermal
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp' + formatted;
};

interface PrintStrukOptions {
  width?: '58mm' | '80mm';
  paperSize?: '58mm' | '80mm'; // Alternative property name
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

interface OrderData {
  id: string;
  shortId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  date: string;
  cashierName?: string;
  deliveryType?: string;
  isPriority?: boolean;
  estimatedCompletion?: string; // Format yang sudah diproses untuk tampilan
  estimated_completion?: string; // Field dari database untuk kompatibilitas
  statusHistory?: { status: string; timestamp: string }[];
  status: string;
  timestamp: string;
}

interface BusinessProfile {
  name?: string;
  businessName?: string; // Added to support tenant.businessName
  address?: string;
  phone?: string;
  logo?: string;
  status?: string; // 'free' | 'premium' | 'suspended'
}

// Konstanta untuk local storage
const LAST_CONNECTED_PRINTER_KEY = 'lastConnectedPrinter';

// Fungsi untuk menyimpan printer terakhir yang berhasil terkoneksi
const saveLastConnectedPrinter = (device: any) => {
  if (device && device.address && device.name) {
    const printerInfo = {
      address: device.address,
      name: device.name,
      class: device.class,
      id: device.id || device.address
    };
   
    localStorage.setItem(LAST_CONNECTED_PRINTER_KEY, JSON.stringify(printerInfo));
  }
};

// Fungsi untuk mendapatkan printer terakhir yang berhasil terkoneksi
const getLastConnectedPrinter = () => {
  try {
    const savedPrinter = localStorage.getItem(LAST_CONNECTED_PRINTER_KEY);
    if (savedPrinter) {
      const printerInfo = JSON.parse(savedPrinter);
     
      return printerInfo;
    }
  } catch (e) {
    // Error handling
  }
  return null;
};

export const usePrintStruk = () => {
  const { toast } = useToast();
  const { tenant } = useContext(TenantContext);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [receiptSettingsLoaded, setReceiptSettingsLoaded] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const { hasAccess: hasReceiptCustomization } = useFeature('receipt_customization');
  const [receiptSettings, setReceiptSettings] = useState<any>({
    show_logo: true,
    show_business_name: true,
    show_address: true,
    show_phone: true,
    show_customer_info: true,
    show_cashier_name: true,
    header_text: '',
    footer_text: 'Terima kasih telah menggunakan jasa kami!',
    custom_thank_you_message: 'Terima kasih telah menggunakan jasa kami!',
    show_qr_code: false,
    qr_code_url: '',
  });

  // Refresh receipt settings from database - deklarasi di sini akan dihapus
  // karena ada deklarasi lain di bawah

  // Load receipt settings when component mounts
  useEffect(() => {
    const loadSettings = async () => {
      await refreshReceiptSettings();
    };
    
    loadSettings();
  }, [hasReceiptCustomization]);

  // Generate ESC/POS commands for printing
  const generateStrukData = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    tenantInfo = tenant // Menggunakan tenant dari context sebagai default
  ): Promise<string> => {
    // Kode untuk generate struk data
    // Order data processing
    // Business profile processing
    // Tenant status processing
    try {
      // Import the ESC/POS utility
      const { EscPos } = await import('@/utils/escpos');
      const escpos = new EscPos();
      
      // Reset printer
      escpos.init();
      
      // Set print width for 58mm printer
      escpos.setCharacterWidth(32); // 58mm printer typically supports 32 chars per line
      
      // Logo untuk pengguna premium, teks LAUNDRY PRO untuk pengguna free
      if (tenantStatus === 'premium' && receiptSettings.show_logo && businessProfile.logo) {
        try {
          // Menambahkan logo ke struk
          // Pastikan URL logo valid
          if (businessProfile.logo && businessProfile.logo.startsWith('http')) {
            try {
              // Konversi logo ke ESC/POS bytes - ukuran untuk 58mm printer
              const logoWidth = 384; // Standard width for 58mm printer
              const logoBytes = await convertImageToEscposBytes(businessProfile.logo, logoWidth, Math.floor(logoWidth * 0.6));
              
              // Inisialisasi printer dan set alignment ke center
              escpos.text('\x1B\x40'); // ESC @ - Initialize printer
              escpos.text('\x1B\x61\x01'); // ESC a 1 - center alignment
              
              // Konversi Uint8Array ke string untuk logo
              let logoData = '';
              for (let i = 0; i < logoBytes.length; i++) {
                logoData += String.fromCharCode(logoBytes[i]);
              }
              
              // Tambahkan data logo langsung setelah center alignment
              escpos.text(logoData);
              // Tidak perlu feed tambahan setelah logo untuk mengurangi jarak ke header
            } catch (error) {
              // Gagal menambahkan logo
              // Fallback ke teks jika logo gagal
              escpos.text('\x1B\x21\x30'); // Double height
              escpos.text('LAUNDRYPRO\n');
              escpos.text('\x1B\x21\x00'); // Normal text
            }
          } else {
            // URL logo tidak valid
          }
        } catch (error) {
          // Gagal menambahkan logo
        }
      } else if (tenantStatus !== 'premium') {
        // Tampilkan teks LAUNDRY PRO untuk pengguna free
        escpos.center();
        escpos.text('\x1B\x21\x30'); // Double height
        escpos.text('LAUNDRYPRO\n');
        escpos.text('\x1B\x21\x00'); // Normal text
      }
      
      // Info tenant - nama bisnis setelah logo
      escpos.center().bold(true).text(businessProfile?.businessName || businessProfile?.name || 'LAUNDRYPRO').bold(false).feed(1);
      
      // Header section - hanya untuk premium
      if (tenantStatus === 'premium' && receiptSettings.header_text) {

        escpos.center().text(receiptSettings.header_text).feed(1);
      }
      escpos.center().text(businessProfile?.address || '-').feed(1);
      escpos.center().text(`Telp: ${businessProfile?.phone || '-'}`).feed(1);
      
      escpos.feed(1).line().feed(1);
      
      // Order details - menggunakan pendekatan yang lebih langsung
      escpos.left(); // Left alignment
      escpos.text(`No Order: ${order.shortId || order.id?.slice(-4) || '-'}`).feed(1);
      escpos.text(`Tanggal: ${order.date || '-'}`).feed(1);
      
      // Hanya tampilkan kasir jika pengaturan show_cashier_name aktif
      if (receiptSettings.show_cashier_name) {
        let cashierName = order.cashierName;
        if (!cashierName || cashierName === '-') {
          cashierName = tenantInfo?.businessName || '-';
        }
        escpos.text(`Kasir: ${cashierName}`).feed(1);
      }
      
      
      escpos.text(`Nama: ${order.customerName || '-'}`).feed(1);
      escpos.text(`No HP: ${order.customerPhone || '-'}`).feed(1);
      
      // Alamat pelanggan - pastikan ditampilkan dengan benar
      // Jika alamat terlalu panjang, pecah menjadi beberapa baris
      if (order.customerAddress && order.customerAddress !== '-') {
        const maxWidth = 32; // 32 karakter per baris untuk printer 58mm
        const address = order.customerAddress.trim();
        
        escpos.text('Alamat: ');
        
        if (address.length <= maxWidth - 8) { // 8 adalah panjang 'Alamat: '
          escpos.text(address).feed(1);
        } else {
          // Pecah alamat menjadi beberapa baris
          escpos.feed(1); // Baris baru setelah 'Alamat: '
          
          let remainingAddress = address;
          while (remainingAddress.length > 0) {
            const chunk = remainingAddress.substring(0, maxWidth);
            escpos.text(chunk).feed(1);
            remainingAddress = remainingAddress.substring(maxWidth);
          }
        }
      } else {
        escpos.text(`Alamat: -`).feed(1);
      }
      
      // Tambahkan informasi jemput/antar jika ada
      if (order.deliveryType) {
        escpos.text(`Jemput/Antar: ${order.deliveryType}`).feed(1);
      }
      
    
      
      // Perbaiki logika untuk menangani lebih banyak kasus
      // Cast order ke any untuk mengakses properti is_priority yang mungkin ada
      const rawOrder = order as any;
      const isPriority = order.isPriority === true || 
                        order.isPriority === 'true' || 
                        order.isPriority === 1 || 
                        order.isPriority === '1' || 
                        (rawOrder && rawOrder.is_priority === true) || 
                        (rawOrder && rawOrder.is_priority === 'true') || 
                        (rawOrder && rawOrder.is_priority === 1) || 
                        (rawOrder && rawOrder.is_priority === '1');
      
      // isPriority sudah dievaluasi
      escpos.text(`Prioritas: ${isPriority ? 'Ya' : 'Tidak'}`).feed(1);
      
      // Gunakan pendekatan sederhana untuk estimasi seperti di OrderDetail.tsx
      let estimasiText = '-';
      
      // Prioritaskan estimated_completion dari database
      if (order.estimated_completion) {
        try {
          // Gunakan toLocaleString tanpa opsi tambahan untuk konsistensi
          const estimasi = new Date(order.estimated_completion).toLocaleString('id-ID');
          if (estimasi !== 'Invalid Date') {
            estimasiText = estimasi;
          } else {
            estimasiText = String(order.estimated_completion);
          }
        } catch (e) {
          // Gunakan nilai asli jika parsing gagal
          estimasiText = String(order.estimated_completion);
        }
      } else if (order.estimatedCompletion && order.estimatedCompletion !== '-') {
        estimasiText = order.estimatedCompletion;
      }
      escpos.text(`Estimasi Selesai: ${estimasiText}`).feed(1);
      
      escpos.feed(1).line().feed(1);
      
      // Items
      const maxItemLength = 12;
      const maxQtyLength = 3;
      const maxPriceLength = 8;
      const maxTotalLength = 8;
      
      // Header for items table
      escpos.text(
        'Item'.padEnd(maxItemLength) + 
        'Qty'.padStart(maxQtyLength) + 
        'Harga'.padStart(maxPriceLength) + 
        'Total'.padStart(maxTotalLength)
      ).feed(1);
      
      escpos.line().feed(1);
      
      // Items
      for (const item of order.items) {
        const itemName = item.name.length > maxItemLength 
          ? item.name.substring(0, maxItemLength - 1) + '.' 
          : item.name.padEnd(maxItemLength);
        
        const qty = item.quantity.toString().padStart(maxQtyLength);
        const price = formatCurrency(item.price).padStart(maxPriceLength);
        const total = formatCurrency(item.price * item.quantity).padStart(maxTotalLength);
        
        escpos.text(itemName + qty + price + total).feed(1);
      }
      
      escpos.feed(1).line().feed(1);
      
      // Totals
      const labelWidth = 16;
      
      if (order.discount > 0) {
        escpos.text('Diskon:'.padEnd(labelWidth) + '-' + formatCurrency(order.discount)).feed(1);
      }
      
      escpos.bold(true).text('Total:'.padEnd(labelWidth) + formatCurrency(order.total)).bold(false).feed(1);
      
      escpos.text('Metode Pembayaran:'.padEnd(labelWidth) + order.paymentMethod).feed(1);
      
      if (order.amountReceived !== undefined) {
        escpos.text('Dibayar:'.padEnd(labelWidth) + formatCurrency(order.amountReceived)).feed(1);
      }
      
      if (order.change !== undefined) {
        escpos.text('Kembalian:'.padEnd(labelWidth) + formatCurrency(order.change)).feed(1);
      }
      
      // Status History
      if (order.statusHistory && order.statusHistory.length > 0) {
        escpos.feed(1).line().feed(1);
        escpos.bold(true).text('Riwayat Status:').bold(false).feed(1);
        
        for (const history of order.statusHistory) {
          escpos.text(`${history.status}: ${history.timestamp}`).feed(1);
        }
      }
      
      // Footer
      escpos.feed(1).line().feed(1);
      
      // Only print custom thank you message if it's different from footer text
      // This prevents duplicate messages
      if (receiptSettings.custom_thank_you_message && 
          receiptSettings.custom_thank_you_message !== receiptSettings.footer_text) {
        escpos.center().text(receiptSettings.custom_thank_you_message).feed(1);
      }
      
      // Footer text if available
      if (tenantStatus === 'premium' && receiptSettings.footer_text) {

        escpos.feed(1).center().text(receiptSettings.footer_text).feed(1);
      } else {
        // Default footer untuk semua pengguna

        escpos.feed(1).center().text('Terima kasih telah menggunakan jasa kami!').feed(1);
      }
      
      
      // QR Code for premium users
      if (tenantStatus === 'premium' && receiptSettings.show_qr_code && receiptSettings.qr_code_url) {
        try {

          
          // Validasi URL QR code
          if (receiptSettings.qr_code_url && (
              receiptSettings.qr_code_url.startsWith('http') || 
              receiptSettings.qr_code_url.startsWith('https') || 
              receiptSettings.qr_code_url.startsWith('data:')
          )) {
            try {

              // Konversi QR code ke format ESC/POS
              const qrWidth = 384; // Lebar maksimum untuk printer 58mm
              const qrHeight = Math.floor(qrWidth * 0.6); // Tinggi proporsional
              

              
              // Konversi gambar QR code ke bytes ESC/POS
              const qrCodeBytes = await convertImageToEscposBytes(
                receiptSettings.qr_code_url, 
                qrWidth, 
                qrHeight
              );
              
              // Set alignment ke center (\x1B\x61\x01)
              escpos.text('\x1B\x61\x01');
              
              // Konversi bytes ke string untuk dikirim ke printer
              let qrData = '';
              for (let i = 0; i < qrCodeBytes.length; i++) {
                qrData += String.fromCharCode(qrCodeBytes[i]);
              }
              
              // Tambahkan QR code ke struk
              escpos.text(qrData);
              
              // Tambahkan spasi setelah QR code
              escpos.feed(2);
              

            } catch (error) {
              // Jika gagal menambahkan QR code, tampilkan pesan fallback

              escpos.center().text('Scan QR code di website kami').feed(1);
            }
          } else {
            // URL QR code tidak valid

            escpos.center().text('Scan QR code di website kami').feed(1);
          }
        } catch (error) {
          // Error umum pada bagian QR code

          escpos.center().text('Scan QR code di website kami').feed(1);
        }
      }
      
      // Marketing content for free users
      if (tenantStatus !== 'premium') {
        escpos.feed(1).line().feed(1);
        escpos.center().bold(true).text('Dibuat dengan LaundryPro App').bold(false).feed(1);
        escpos.center().text('Kelola laundry dengan mudah').feed(1);
        escpos.center().text('Download di Google Play Store').feed(1);
      }
      
      // Cut paper
      escpos.feed(4).cut();
      
      return escpos.encode();
    } catch (error) {
      console.error('Error generating struk data:', error);
      throw error;
    }
  };

  // Validate data before printing
  const validatePrintData = (order: OrderData, businessProfile: BusinessProfile): boolean => {
   
    
    // Check order data
    if (!order || !order.id) {
     
      toast({ 
        title: "Data tidak lengkap", 
        description: "Data pesanan tidak lengkap. ID pesanan tidak ditemukan.", 
        variant: "destructive" 
      });
      return false;
    }
    
    // Check order items
    if (!order.items || order.items.length === 0) {
     
      toast({ 
        title: "Data tidak lengkap", 
        description: "Tidak ada item dalam pesanan.", 
        variant: "destructive" 
      });
      return false;
    }
    
    // Check business profile
    if (!businessProfile || (!businessProfile.name && !businessProfile.businessName)) {
     
      toast({ 
        title: "Data tidak lengkap", 
        description: "Profil bisnis tidak lengkap. Pastikan nama bisnis terisi.", 
        variant: "destructive" 
      });
      return false;
    }
    
    // Validasi estimasi selesai
    if (order.estimatedCompletion) {
      try {
        // Pastikan format estimasi valid
        const estimatedDate = new Date(order.estimatedCompletion);
        if (isNaN(estimatedDate.getTime())) {
       
          toast({ 
            title: "Peringatan", 
            description: "Format tanggal estimasi tidak valid. Struk akan tetap dicetak.", 
            variant: "warning" 
          });
          // Tetap lanjutkan mencetak meskipun ada warning
        }
      } catch (e) {
      
      }
    }
    
    // Validasi total harga
    if (typeof order.total !== 'number' || isNaN(order.total)) {
     
      toast({ 
        title: "Data tidak lengkap", 
        description: "Total harga tidak valid. Pastikan total harga terisi dengan benar.", 
        variant: "destructive" 
      });
      return false;
    }
    
  
    return true;
  };
  
  // Load fresh receipt settings from database
  const refreshReceiptSettings = async (): Promise<boolean> => {
    if (!hasReceiptCustomization) {
      setDataLoading(false);
      setReceiptSettingsLoaded(true);
      return true;
    }
    
    try {
      setDataLoading(true);
      
      // Pastikan kita memiliki tenant.id untuk filter
      if (!tenant || !tenant.id) {
  
        setDataLoading(false);
        return false;
      }
      

      
      // Fetch settings dari Supabase berdasarkan business_id yang sesuai dengan tenant saat ini
      const { data, error } = await supabase
        .from('receipt_settings' as any)
        .select('*')
        .eq('business_id', tenant.id); // Filter berdasarkan business_id yang sesuai dengan tenant.id
        
      if (error) {

        setDataLoading(false);
        // Fallback to localStorage if no database settings
        const settings = localStorage.getItem(`receiptSettings_${tenant.id}`);
        if (settings) {
          try {
            const parsedSettings = JSON.parse(settings);
            setReceiptSettings(parsedSettings);

          } catch (e) {

          }
        }
      } else if (data && data.length > 0) {
        // Update receipt settings with data from database
        const dbSettings = data[0];

        
        // Merge default settings with database settings
        const mergedSettings = {
          ...receiptSettings,
          ...dbSettings
        };
        
        // Update state with merged settings
        setReceiptSettings(mergedSettings);
        
        // Save to localStorage as backup with tenant ID in the key
        localStorage.setItem(`receiptSettings_${tenant.id}`, JSON.stringify(mergedSettings));
      } else {

      }
      
      setDataLoading(false);
      setReceiptSettingsLoaded(true);
      return true;
    } catch (error) {

      setDataLoading(false);
      setReceiptSettingsLoaded(true);
      return false;
    }
  };

  // Handle printing
  const printStruk = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintStrukOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);
    
    try {
    
      
      // Validate data first
      if (!validatePrintData(order, businessProfile)) {
       
        setLoading(false);
        if (onError) onError(new Error('Invalid print data'));
        return;
      }
      
   
      if (hasReceiptCustomization) {
        toast({
          title: "Memuat pengaturan",
          description: "Sedang memuat pengaturan struk...",
        });
        const settingsRefreshed = await refreshReceiptSettings();
        if (!settingsRefreshed) {
         
        }
      }
      
      // Kode untuk refresh data order telah dipindahkan ke dalam fungsi printStruk dan connectToDevice
      // untuk menghindari error 'Cannot find name order'
      
      // Cek apakah QR code diaktifkan untuk pengguna premium
      if (tenantStatus === 'premium' && receiptSettings.show_qr_code) {

      }
      
      // Persiapan data order untuk cetak
      
      // Pastikan nilai isPriority diset dengan benar
      // Jika isPriority undefined, default ke false
      if (order.isPriority === undefined) {
        // Dalam beberapa kasus, data dari database mungkin menggunakan is_priority
        // Cek apakah ada properti is_priority di objek order (meskipun tidak dalam interface)
        const rawOrder = order as any; // Cast ke any untuk akses properti yang tidak dalam interface
        if (rawOrder && typeof rawOrder.is_priority !== 'undefined') {
          order.isPriority = Boolean(rawOrder.is_priority);
        } else {
          // Default ke false jika keduanya undefined
          order.isPriority = false;
        }
      }
      

      
      // Cek koneksi printer terlebih dahulu
      bluetoothSerial.isConnected(
        // Callback jika sudah terkoneksi
        async () => {
          try {
            // Order data sudah siap untuk dicetak
            
            // Generate struk data
            const strukData = await generateStrukData(order, businessProfile, tenantStatus, tenant);
            
            // Print struk
            bluetoothSerial.write(
              strukData,
              () => {
                // Struk berhasil di-print
                toast({ 
                  title: "Berhasil", 
                  description: "Struk berhasil di-print", 
                  variant: "default" 
                });
                setLoading(false);
                if (onSuccess) onSuccess();
              },
              (error) => {
                // Handle error if print fails
                toast({ 
                  title: "Gagal", 
                  description: "Gagal mencetak struk", 
                  variant: "destructive" 
                });
                setLoading(false);
                if (onError) onError(error);
              }
            );
            
            // Refresh data order dari database untuk memastikan data terbaru
            if (order.id) {
              try {
                const { data: freshOrderData, error } = await supabase
                  .from('orders')
                  .select('*, customers(*)')
                  .eq('id', order.id)
                  .single();
                  
                if (!error && freshOrderData) {
                  // Update alamat pelanggan jika ada
                  if (freshOrderData.customers && freshOrderData.customers.address) {
                    order.customerAddress = freshOrderData.customers.address;
                  }
                  
                  // Update nama pelanggan jika ada
                  if (freshOrderData.customers && freshOrderData.customers.name) {
                    order.customerName = freshOrderData.customers.name;
                  }
                  
                  // Update nomor telepon pelanggan jika ada
                  if (freshOrderData.customers && freshOrderData.customers.phone) {
                    order.customerPhone = freshOrderData.customers.phone;
                  }
                }
              } catch (e) {
                // Error handling
              }
            }
          } catch (e) {
            // Continue with printing even if order data refresh fails
            // Error handling
          }
        },
        // Callback jika tidak terkoneksi - akan ditangani di bagian selanjutnya
        async () => {
          // Jika tidak terkoneksi, coba koneksi manual ke device yang dipilih
          try {
            const strukData = await generateStrukData(order, businessProfile, tenantStatus, tenant);
            // Pastikan device sudah didefinisikan sebelum digunakan
            if (!device || !device.address) {
              throw new Error('Printer tidak ditemukan atau tidak dipilih');
            }
            
            // Coba koneksi ke printer
            bluetoothSerial.connect(
              device.address,
              async () => {
                // Berhasil terkoneksi ke printer
                try {
                  // Notify successful connection
                  toast({ 
                    title: "Berhasil", 
                    description: `Berhasil terhubung ke ${device.name || 'printer'}`, 
                    variant: "default" 
                  });
                  
                  // Simpan printer yang berhasil terkoneksi
                  saveLastConnectedPrinter(device);
                  
                  // Refresh receipt settings jika diperlukan
                  if (hasReceiptCustomization) {
                    const settingsRefreshed = await refreshReceiptSettings();
                    if (!settingsRefreshed) {
                      // Receipt settings could not be refreshed
                    }
                  }
                  
                  // Refresh data order dari database untuk memastikan data terbaru
                  if (order.id) {
                    try {
                      const { data: latestOrderData, error } = await supabase
                        .from('orders')
                        .select('*, customers(*)')
                        .eq('id', order.id)
                        .single();
                        
                      if (!error && latestOrderData) {
                        // Update estimasi selesai jika ada
                        if (latestOrderData.estimated_completion) {
                          // Format tanggal estimasi selesai dengan benar
                          const estimatedDate = new Date(latestOrderData.estimated_completion);
                          if (!isNaN(estimatedDate.getTime())) {
                            order.estimatedCompletion = estimatedDate.toLocaleString("id-ID", { dateStyle: 'short' });
                          } else {
                            order.estimatedCompletion = latestOrderData.estimated_completion;
                          }
                        }
                        
                        // Update alamat pelanggan jika ada
                        if (latestOrderData.customers && latestOrderData.customers.address) {
                          order.customerAddress = latestOrderData.customers.address;
                        }
                        
                        // Update nama pelanggan jika ada
                        if (latestOrderData.customers && latestOrderData.customers.name) {
                          order.customerName = latestOrderData.customers.name;
                        }
                        
                        // Update nomor telepon pelanggan jika ada
                        if (latestOrderData.customers && latestOrderData.customers.phone) {
                          order.customerPhone = latestOrderData.customers.phone;
                        }
                      }
                    } catch (e) {
                      // Error handling
                    }
                  }
                  
                  // Cetak struk setelah refresh data
                  const updatedStrukData = await generateStrukData(order, businessProfile, tenantStatus, tenant);
                  bluetoothSerial.write(
                    updatedStrukData,
                    () => {
                      // Struk berhasil di-print
                      toast({ 
                        title: "Berhasil", 
                        description: "Struk berhasil di-print", 
                        variant: "default" 
                      });
                      setLoading(false);
                      if (onSuccess) onSuccess();
                    },
                    (error: any) => {
                      // Gagal print struk
                      toast({ 
                        title: "Gagal print struk", 
                        description: "Gagal mencetak struk. Silakan coba lagi.", 
                        variant: "destructive" 
                      });
                      setLoading(false);
                      if (onError) onError(error);
                    }
                  );
                } catch (error) {
                  // Error saat proses printing
                  toast({ 
                    title: "Gagal generate struk", 
                    description: "Terjadi kesalahan saat membuat data struk.", 
                    variant: "destructive" 
                  });
                  setLoading(false);
                  if (onError) onError(error);
                }
              },
              (error: any) => {
                // Gagal koneksi ke printer
                toast({ 
                  title: "Gagal terhubung", 
                  description: `Gagal terhubung ke ${device.name || 'printer'}. Silakan coba lagi.`, 
                  variant: "destructive" 
                });
                setLoading(false);
                if (onError) onError(error);
              }
            );
          } catch (error) {
            // Error dalam proses koneksi manual
            toast({ 
              title: "Gagal", 
              description: "Gagal mempersiapkan printer. Silakan coba lagi.", 
              variant: "destructive" 
            });
            setLoading(false);
            if (onError) onError(error);
          }
        }
      )
    } catch (error) {
      // Error handling
      toast({ 
        title: "Gagal", 
        description: "Terjadi kesalahan saat mencetak struk. Silakan coba lagi.", 
        variant: "destructive" 
      });
      setLoading(false);
      if (onError) onError(error);
    }
  };

  // Function to scan for Bluetooth devices
  const scanBluetoothDevices = async () => {
    setScanning(true);
    try {
      bluetoothSerial.list(
        (devices: any[]) => {
          setAvailableDevices(devices);
          setScanning(false);
        },
        (error: any) => {
          // Error handling
          setScanning(false);
          toast({ 
            title: "Gagal scan", 
            description: "Gagal mencari perangkat Bluetooth. Pastikan Bluetooth aktif.", 
            variant: "destructive" 
          });
        }
      );
    } catch (error) {
      // Error handling
      setScanning(false);
      toast({ 
        title: "Gagal scan", 
        description: "Terjadi kesalahan saat mencari perangkat Bluetooth.", 
        variant: "destructive" 
      });
    }
  };

  // Connect to a Bluetooth device and print
  const connectToDevice = (
    device: any,
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintStrukOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);
    
    bluetoothSerial.connect(
      device.address,
      async () => {
        // Berhasil terkoneksi ke printer
        try {
          // Notify successful connection
          toast({ 
            title: "Berhasil", 
            description: `Berhasil terhubung ke ${device.name || 'printer'}`, 
            variant: "default" 
          });
          
          // Simpan printer yang berhasil terkoneksi
          saveLastConnectedPrinter(device);
          
          // Refresh receipt settings jika diperlukan
          if (hasReceiptCustomization) {
            const settingsRefreshed = await refreshReceiptSettings();
            if (!settingsRefreshed) {
              // Receipt settings could not be refreshed
            }
          }
          
          // Refresh data order dari database untuk memastikan data terbaru
          if (order.id) {
            try {
              const { data: latestOrderData, error } = await supabase
                .from('orders')
                .select('*, customers(*)')
                .eq('id', order.id)
                .single();
                
              if (!error && latestOrderData) {
                // Update estimasi selesai jika ada - menggunakan pendekatan sederhana seperti di OrderDetail.tsx
                if (latestOrderData.estimated_completion) {
                  try {
                    // Gunakan pendekatan sederhana seperti di OrderDetail.tsx
                    const estimasi = new Date(latestOrderData.estimated_completion).toLocaleString('id-ID');
                    if (estimasi !== 'Invalid Date') {
                      order.estimatedCompletion = estimasi;
                    } else {
                      order.estimatedCompletion = String(latestOrderData.estimated_completion);
                    }
                    // Simpan juga data asli untuk kompatibilitas
                    order.estimated_completion = latestOrderData.estimated_completion;
                  } catch (e) {
                    // Fallback ke string asli jika parsing gagal
                    order.estimatedCompletion = String(latestOrderData.estimated_completion);
                    order.estimated_completion = latestOrderData.estimated_completion;
                  }
                }
                
                // Update alamat pelanggan jika ada
                if (latestOrderData.customers && latestOrderData.customers.address) {
                  order.customerAddress = latestOrderData.customers.address;
                }
                
                // Update nama pelanggan jika ada
                if (latestOrderData.customers && latestOrderData.customers.name) {
                  order.customerName = latestOrderData.customers.name;
                }
                
                // Update nomor telepon pelanggan jika ada
                if (latestOrderData.customers && latestOrderData.customers.phone) {
                  order.customerPhone = latestOrderData.customers.phone;
                }
              }
            } catch (e) {
              // Error handling
            }
          }
          
          // Cetak struk setelah refresh data
          const updatedStrukData = await generateStrukData(order, businessProfile, tenantStatus, tenant);
          bluetoothSerial.write(
            updatedStrukData,
            () => {
              // Struk berhasil di-print
              toast({ 
                title: "Berhasil", 
                description: "Struk berhasil di-print", 
                variant: "default" 
              });
              setLoading(false);
              if (onSuccess) onSuccess();
            },
            (error: any) => {
              // Gagal print struk
              toast({ 
                title: "Gagal print struk", 
                description: "Gagal mencetak struk. Silakan coba lagi.", 
                variant: "destructive" 
              });
              setLoading(false);
              if (onError) onError(error);
            }
          );
        } catch (error) {
          // Error saat proses printing
          toast({ 
            title: "Gagal generate struk", 
            description: "Terjadi kesalahan saat membuat data struk.", 
            variant: "destructive" 
          });
          setLoading(false);
          if (onError) onError(error);
        }
      },
      (error: any) => {
        // Gagal koneksi ke printer
        toast({ 
          title: "Gagal terhubung", 
          description: `Gagal terhubung ke ${device.name || 'printer'}. Silakan coba lagi.`, 
          variant: "destructive" 
        });
        setLoading(false);
        if (onError) onError(error);
      }
    );
  };

  return {
    printStruk,
    scanBluetoothDevices,
    connectToDevice,
    loading,
    dataLoading,
    scanning,
    availableDevices,
    generateStrukData,
    validatePrintData,
    refreshReceiptSettings
  };
};