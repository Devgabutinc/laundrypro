import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFeature } from '@/hooks/useFeature';
import { convertImageToEscposBytes } from '@/utils/convertImageToEscposBytes';

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
  estimatedCompletion?: string;
  statusHistory?: { status: string; timestamp: string }[];
}

interface BusinessProfile {
  name?: string;
  businessName?: string; // Added to support tenant.businessName
  address?: string;
  phone?: string;
  logo?: string;
  status?: string; // 'free' | 'premium' | 'suspended'
}

export const usePrintStruk = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
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

  useEffect(() => {
    // Load receipt settings from database if available
    const loadReceiptSettings = async () => {
      try {
        if (!hasReceiptCustomization) return;
        
        // Fetch settings from Supabase
        const { data, error } = await supabase
          .from('receipt_settings')
          .select('*')
          .single();
          
        if (error && error.code !== 'PGRST116') {
          // Error fetching receipt settings
          return;
        }
        
        if (data) {
          // Receipt settings loaded from database
          setReceiptSettings(data);
        } else {
          // Fallback to localStorage if no database settings
          const settings = localStorage.getItem('receiptSettings');
          if (settings) {
            setReceiptSettings(JSON.parse(settings));
          }
        }
      } catch (error) {
        // Error loading receipt settings
      }
    };

    loadReceiptSettings();
  }, [hasReceiptCustomization]);

  // Generate ESC/POS commands for printing
  const generateStrukData = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string
  ): Promise<string> => {
    // Debug logging
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
      escpos.text(`Kasir: ${order.cashierName || '-'}`).feed(1);
      escpos.text(`Nama: ${order.customerName || '-'}`).feed(1);
      escpos.text(`No HP: ${order.customerPhone || '-'}`).feed(1);
      escpos.text(`Alamat: ${order.customerAddress || '-'}`).feed(1);
      
      // Tambahkan informasi jemput/antar jika ada
      if (order.deliveryType) {
        escpos.text(`Jemput/Antar: ${order.deliveryType}`).feed(1);
      }
      
      // Tambahkan informasi prioritas jika ada
      if (order.isPriority) {
        escpos.text(`Prioritas: Ya`).feed(1);
      } else {
        escpos.text(`Prioritas: Tidak`).feed(1);
      }
      
      // Tambahkan informasi estimasi jika ada
      if (order.estimatedCompletion && order.estimatedCompletion !== '-') {
        escpos.text(`Estimasi: ${order.estimatedCompletion}`).feed(1);
      } else {
        escpos.text(`Estimasi: -`).feed(1);
      }
      
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
      if (receiptSettings.footer_text) {
        escpos.center().text(receiptSettings.footer_text).feed(1);
      }
      
      // QR Code for premium users
      if (tenantStatus === 'premium' && receiptSettings.show_qr_code && receiptSettings.qr_code_url) {
        try {
          // Menambahkan QR code ke struk

          // Pastikan URL QR code valid
          if (receiptSettings.qr_code_url && receiptSettings.qr_code_url.startsWith('http')) {
            try {
              // Konversi QR code ke ESC/POS bytes - ukuran untuk 58mm printer
              const qrWidth = 384; // Standard width for 58mm printer
              const qrCodeBytes = await convertImageToEscposBytes(receiptSettings.qr_code_url, qrWidth, Math.floor(qrWidth * 0.5));
              
              // Set alignment ke center untuk QR code
              escpos.text('\x1B\x61\x01'); // ESC a 1 - center alignment
              
              // Konversi Uint8Array ke string untuk QR code
              let qrData = '';
              for (let i = 0; i < qrCodeBytes.length; i++) {
                qrData += String.fromCharCode(qrCodeBytes[i]);
              }
              
              // Tambahkan data QR code langsung setelah center alignment
              escpos.text(qrData);
              escpos.feed(2);
            } catch (error) {
              // Error adding QR code to receipt
            }
          } else {
            // URL QR code tidak valid
          }
        } catch (error) {
          // Error adding QR code to receipt
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
      // Error generating struk data
      throw error;
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
      // Cek koneksi printer terlebih dahulu
      bluetoothSerial.isConnected(
        async () => {
          // Printer sudah terkoneksi, langsung print
          // Langsung print struk tanpa preview
          const strukData = await generateStrukData(order, businessProfile, tenantStatus);
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
        },
        async () => {
          // Printer belum terkoneksi, mencari printer
          // Cek apakah printer sudah pernah dipasangkan
          bluetoothSerial.list(
            async (devices: any) => {
              // Daftar device ditemukan
              // Filter device yang memiliki nama
              const filteredDevices = (devices || []).filter((d: any) => d.name);
              // Device dengan nama ditemukan
              setAvailableDevices(filteredDevices);
              
              // Cari printer yang sudah pernah dipasangkan
              const pairedPrinter = filteredDevices.find((d: any) => 
                d.name?.toLowerCase().includes('58printer') || 
                d.name?.toLowerCase().includes('panda') ||
                d.name?.toLowerCase().includes('prj-58d')
              );

              if (pairedPrinter) {
                // Printer ditemukan, mencoba koneksi
                // Coba koneksi ke printer yang sudah dipasangkan
                bluetoothSerial.connectInsecure(
                  pairedPrinter.address,
                  async () => {
                    // Berhasil terkoneksi ke printer
                    // Langsung print struk setelah terkoneksi
                    const strukData = await generateStrukData(order, businessProfile, tenantStatus);
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
                  },
                  () => {
                    // Gagal koneksi ke printer yang dipasangkan
                    toast({ 
                      title: "Printer tidak tersambung", 
                      description: "Silakan pilih printer Bluetooth dari daftar.", 
                      variant: "destructive" 
                    });
                    setLoading(false);
                    if (onError) onError(new Error('Failed to connect to paired printer'));
                  }
                );
              } else {
                // Printer tidak ditemukan
                toast({ 
                  title: "Printer tidak ditemukan", 
                  description: "Silakan sambungkan printer Bluetooth Anda.", 
                  variant: "destructive" 
                });
                setLoading(false);
                if (onError) onError(new Error('No printer found'));
              }
            },
            (error: any) => {
              // Gagal mencari printer
              toast({ 
                title: "Gagal mencari printer", 
                description: "Gagal mencari printer Bluetooth. Pastikan Bluetooth aktif.", 
                variant: "destructive" 
              });
              setLoading(false);
              if (onError) onError(error);
            }
          );
        }
      );
    } catch (error) {
      // Error printing struk
      toast({ 
        title: "Gagal print struk", 
        description: "Terjadi kesalahan saat mencetak struk.", 
        variant: "destructive" 
      });
      setLoading(false);
      if (onError) onError(error);
    }
  };

  // Scan for Bluetooth devices
  const scanBluetoothDevices = () => {
    setScanning(true);
    bluetoothSerial.list(
      (devices: any) => {
        // Daftar device ditemukan
        // Filter device yang memiliki nama
        const filteredDevices = (devices || []).filter((d: any) => d.name);
        // Device dengan nama ditemukan
        setAvailableDevices(filteredDevices);
        setScanning(false);
      },
      (error: any) => {
        // Gagal mencari printer
        toast({ 
          title: "Gagal mencari printer", 
          description: "Gagal mencari printer Bluetooth. Pastikan Bluetooth aktif.", 
          variant: "destructive" 
        });
        setScanning(false);
      }
    );
  };

  // Connect to a Bluetooth device
  const connectToDevice = async (
    device: any,
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintStrukOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);

    bluetoothSerial.connectInsecure(
      device.address,
      async () => {
        // Berhasil terkoneksi ke printer
        toast({ 
          title: "Berhasil", 
          description: `Berhasil terhubung ke ${device.name || 'printer'}`, 
          variant: "default" 
        });

        // Langsung print struk setelah terkoneksi
        try {
          const strukData = await generateStrukData(order, businessProfile, tenantStatus);
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
          // Error generating struk data
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
    scanning,
    availableDevices,
    generateStrukData
  };
};
