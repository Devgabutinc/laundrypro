import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
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

interface PrintLabelOptions {
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
  note?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  paymentStatus?: string;
  date: string;
  estimatedCompletion?: string;
  estimatedDoneAt?: string;
  deliveryType?: string;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
}

interface BusinessProfile {
  name?: string;
  businessName?: string;
  logo?: string;
  status?: string; // 'free' | 'premium' | 'suspended'
}

export const usePrintLabel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  // Generate ESC/POS commands for printing label
  const generateLabelData = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string
  ): Promise<string> => {
    try {
      // Import the ESC/POS utility
      const { EscPos } = await import('@/utils/escpos');
      const escpos = new EscPos();
      
      // Reset printer
      escpos.init();
      
      // Set print width for 58mm printer
      escpos.setCharacterWidth(32); // 58mm printer typically supports 32 chars per line
      
      // Logo untuk pengguna premium, teks LAUNDRY PRO untuk pengguna free
      if (tenantStatus === 'premium' && businessProfile.logo) {
        try {
          // console.log removed('[DEBUG] Menambahkan logo ke label...', businessProfile.logo);
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
            } catch (error) {
              // console.error removed('[DEBUG] Gagal menambahkan logo:', error);
              // Fallback ke teks jika logo gagal
              escpos.text('\x1B\x21\x30'); // Double height
              escpos.text('LAUNDRYPRO\n');
              escpos.text('\x1B\x21\x00'); // Normal text
            }
          }
        } catch (error) {
          // console.error removed('[DEBUG] Gagal menambahkan logo:', error);
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
      
      // Separator
      escpos.feed(1).line().feed(1);
      
      // Customer Name (Large)
      escpos.center().text('\x1B\x21\x30'); // Double height and width
      escpos.text(order.customerName || '-').feed(1);
      escpos.text('\x1B\x21\x00'); // Normal text
      
      // Order Number (Large)
      escpos.center().text('\x1B\x21\x10'); // Double width
      escpos.text(`No Order: ${order.shortId || order.id?.slice(-4) || '-'}`).feed(1);
      escpos.text('\x1B\x21\x00'); // Normal text
      
      // Estimated Completion (Large)
      if (order.estimatedCompletion && order.estimatedCompletion !== '-') {
        escpos.center().text('\x1B\x21\x10'); // Double width
        escpos.text(`Estimasi: ${order.estimatedCompletion}`).feed(1);
        escpos.text('\x1B\x21\x00'); // Normal text
      }
      
      // Separator
      escpos.feed(1).line().feed(1);
      
      // Order Date
      escpos.left().text(`Tanggal Pesan: ${order.date || '-'}`).feed(1);
      
      // Payment Status
      escpos.text(`Status Pembayaran: ${order.paymentStatus || 'Belum Dibayar'}`).feed(1);
      
      // Total Price
      escpos.bold(true).text(`Total: ${formatCurrency(order.total)}`).bold(false).feed(1);
      
      // Note if available
      if (order.note) {
        escpos.feed(1);
        escpos.text('Catatan:').feed(1);
        escpos.text(order.note).feed(1);
      }
      
      // Customer info
      escpos.text(`Nama: ${order.customer?.name || order.customerName || '-'}`).feed(1);
      escpos.text(`No HP: ${order.customer?.phone || order.customerPhone || '-'}`).feed(1);
      escpos.text(`Alamat: ${order.customer?.address || '-'}`).feed(1);
      
      // Estimated completion
      escpos.text(`Estimasi Selesai: ${order.estimatedDoneAt || order.estimatedCompletion || '-'}`).feed(1);
      
      // Delivery info
      if (order.deliveryType) {
        // Format delivery type
        let formattedDeliveryType = order.deliveryType;
        if (order.deliveryType === 'customer_come') {
          formattedDeliveryType = 'Datang Langsung';
        } else if (order.deliveryType === 'delivery') {
          formattedDeliveryType = 'Antar ke Alamat';
        } else if (order.deliveryType === 'pickup') {
          formattedDeliveryType = 'Jemput dari Alamat';
        } else if (order.deliveryType === 'pickup_delivery') {
          formattedDeliveryType = 'Jemput & Antar';
        }
        escpos.text(`Jemput/Antar: ${formattedDeliveryType}`).feed(1);
      }
      
      // Items
      escpos.bold(true).text('Daftar Item:').bold(false).feed(1);
      
      for (const item of order.items) {
        escpos.text(`- ${item.name} (${item.quantity}x)`).feed(1);
      }
      
      // Cut paper
      escpos.feed(4).cut();
      
      return escpos.encode();
    } catch (error) {
      // console.error removed('Error generating label data:', error);
      throw error;
    }
  };

  // Handle printing label
  const printLabel = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintLabelOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);

    try {
      // Cek koneksi printer terlebih dahulu
      bluetoothSerial.isConnected(
        async () => {
          // console.log removed('[DEBUG] Printer sudah terkoneksi, langsung print label...');
          // Langsung print label tanpa preview
          const labelData = await generateLabelData(order, businessProfile, tenantStatus);
          bluetoothSerial.write(
            labelData,
            () => {
              // console.log removed('[DEBUG] Label berhasil di-print');
              toast({ 
                title: "Berhasil", 
                description: "Label berhasil di-print", 
                variant: "default" 
              });
              setLoading(false);
              if (onSuccess) onSuccess();
            },
            (error: any) => {
              // console.error removed('[DEBUG] Gagal print label:', error);
              toast({ 
                title: "Gagal print label", 
                description: "Gagal mencetak label. Silakan coba lagi.", 
                variant: "destructive" 
              });
              setLoading(false);
              if (onError) onError(error);
            }
          );
        },
        () => {
          // console.log removed('[DEBUG] Printer belum terkoneksi, tampilkan modal scan');
          toast({ 
            title: "Printer tidak terhubung", 
            description: "Silakan hubungkan printer terlebih dahulu", 
            variant: "destructive" 
          });
          setLoading(false);
          if (onError) onError(new Error("Printer not connected"));
        }
      );
    } catch (error) {
      // console.error removed('[DEBUG] Error saat mencetak label:', error);
      toast({ 
        title: "Gagal", 
        description: "Terjadi kesalahan saat mencetak label", 
        variant: "destructive" 
      });
      setLoading(false);
      if (onError) onError(error);
    }
  };

  // Scan for available Bluetooth devices
  const scanBluetoothDevices = () => {
    setScanning(true);
    setAvailableDevices([]);
    
    bluetoothSerial.list(
      (devices: any) => {
        // console.log removed('[DEBUG] Daftar device ditemukan:', JSON.stringify(devices, null, 2));
        // Filter device yang memiliki nama
        const filteredDevices = (devices || []).filter((d: any) => d.name);
        // console.log removed('[DEBUG] Device dengan nama:', JSON.stringify(filteredDevices, null, 2));
        setAvailableDevices(filteredDevices);
        setScanning(false);
      },
      (error: any) => {
        // console.error removed('[DEBUG] Gagal mendapatkan daftar device:', error);
        toast({ 
          title: "Gagal", 
          description: "Gagal mendapatkan daftar perangkat Bluetooth", 
          variant: "destructive" 
        });
        setScanning(false);
      }
    );
  };

  // Connect to a Bluetooth device and print
  const connectToDevice = (
    device: any,
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintLabelOptions = {}
  ) => {
    setLoading(true);
    
    bluetoothSerial.connect(
      device.address,
      async () => {
        // console.log removed('[DEBUG] Berhasil terhubung ke printer:', device.name);
        toast({ 
          title: "Terhubung", 
          description: `Terhubung ke ${device.name}`, 
          variant: "default" 
        });
        
        try {
          // Generate and print label
          const labelData = await generateLabelData(order, businessProfile, tenantStatus);
          bluetoothSerial.write(
            labelData,
            () => {
              // console.log removed('[DEBUG] Label berhasil di-print');
              toast({ 
                title: "Berhasil", 
                description: "Label berhasil di-print", 
                variant: "default" 
              });
              setLoading(false);
              if (options.onSuccess) options.onSuccess();
            },
            (error: any) => {
              // console.error removed('[DEBUG] Gagal print label:', error);
              toast({ 
                title: "Gagal print label", 
                description: "Gagal mencetak label. Silakan coba lagi.", 
                variant: "destructive" 
              });
              setLoading(false);
              if (options.onError) options.onError(error);
            }
          );
        } catch (error) {
          // console.error removed('[DEBUG] Error saat mencetak label:', error);
          toast({ 
            title: "Gagal", 
            description: "Terjadi kesalahan saat mencetak label", 
            variant: "destructive" 
          });
          setLoading(false);
          if (options.onError) options.onError(error);
        }
      },
      (error: any) => {
        // console.error removed('[DEBUG] Gagal terhubung ke printer:', error);
        toast({ 
          title: "Gagal", 
          description: `Gagal terhubung ke ${device.name}`, 
          variant: "destructive" 
        });
        setLoading(false);
        if (options.onError) options.onError(error);
      }
    );
  };

  return {
    printLabel,
    scanBluetoothDevices,
    connectToDevice,
    loading,
    scanning,
    availableDevices
  };
};
