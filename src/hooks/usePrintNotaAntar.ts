import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

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

interface PrintNotaAntarOptions {
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
  paymentStatus?: string;
  date: string;
  estimatedCompletion?: string;
  deliveryType?: string;
  deliveryFee?: number;
  note?: string;
}

interface BusinessProfile {
  name?: string;
  businessName?: string;
  address?: string;
  phone?: string;
  status?: string; // 'free' | 'premium' | 'suspended'
}

export const usePrintNotaAntar = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  // Generate ESC/POS commands for printing nota antar
  const generateNotaAntarData = async (
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
      
      // Header - NOTA ANTAR with large text
      escpos.center();
      escpos.text('\x1B\x21\x30'); // Double height and width
      escpos.text('NOTA ANTAR\n');
      escpos.text('\x1B\x21\x00'); // Normal text
      
      // Business name
      escpos.center().bold(true).text(businessProfile?.businessName || businessProfile?.name || 'LAUNDRYPRO').bold(false).feed(1);
      escpos.center().text(businessProfile?.address || '-').feed(1);
      escpos.center().text(`Telp: ${businessProfile?.phone || '-'}`).feed(1);
      
      // Separator
      escpos.feed(1).line().feed(1);
      
      // Order details
      escpos.left(); // Left alignment
      escpos.text(`No Order: ${order.shortId || order.id?.slice(-4) || '-'}`).feed(1);
      escpos.text(`Tanggal: ${order.date || '-'}`).feed(1);
      
      // Customer info - emphasized
      escpos.text('\x1B\x21\x08'); // Emphasized
      escpos.text(`Nama: ${order.customerName || '-'}`).feed(1);
      escpos.text(`No HP: ${order.customerPhone || '-'}`).feed(1);
      escpos.text(`Alamat: ${order.customerAddress || '-'}`).feed(1);
      escpos.text('\x1B\x21\x00'); // Normal text
      
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
        escpos.text(`Jenis Antar: ${formattedDeliveryType}`).feed(1);
      }
      
      // Estimated completion
      if (order.estimatedCompletion && order.estimatedCompletion !== '-') {
        escpos.text(`Estimasi Selesai: ${order.estimatedCompletion}`).feed(1);
      }
      
      // Separator
      escpos.feed(1).line().feed(1);
      
      // Items
      escpos.bold(true).text('Daftar Item:').bold(false).feed(1);
      
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
      
      // Separator
      escpos.feed(1).line().feed(1);
      
      // Totals
      const labelWidth = 16;
      
      escpos.text('Subtotal:'.padEnd(labelWidth) + formatCurrency(order.subtotal)).feed(1);
      
      if (order.discount > 0) {
        escpos.text('Diskon:'.padEnd(labelWidth) + '-' + formatCurrency(order.discount)).feed(1);
      }
      
      if (order.deliveryFee && order.deliveryFee > 0) {
        escpos.text('Biaya Antar:'.padEnd(labelWidth) + formatCurrency(order.deliveryFee)).feed(1);
      }
      
      escpos.bold(true).text('Total:'.padEnd(labelWidth) + formatCurrency(order.total)).bold(false).feed(1);
      
      // Payment info
      escpos.text('Metode Pembayaran:'.padEnd(labelWidth) + order.paymentMethod).feed(1);
      
      // Format payment status
      let formattedPaymentStatus = order.paymentStatus || 'Belum Dibayar';
      if (formattedPaymentStatus === 'paid') {
        formattedPaymentStatus = 'Sudah Dibayar';
      } else if (formattedPaymentStatus === 'unpaid') {
        formattedPaymentStatus = 'Belum Dibayar';
      } else if (formattedPaymentStatus === 'partial') {
        formattedPaymentStatus = 'Dibayar Sebagian';
      }
      
      escpos.text('Status Pembayaran:'.padEnd(labelWidth) + formattedPaymentStatus).feed(1);
      
      // Note if available
      if (order.note) {
        escpos.feed(1);
        escpos.text('Catatan:').feed(1);
        escpos.text(order.note).feed(1);
      }
      
      // Signature section
      escpos.feed(2);
      escpos.center();
      
      // Create signature section for recipient only
      escpos.text('Penerima').feed(1);
      escpos.feed(3); // Space for signature
      
      escpos.text('(........................)').feed(1);
      
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
      // console.error removed('Error generating nota antar data:', error);
      throw error;
    }
  };

  // Handle printing nota antar
  const printNotaAntar = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintNotaAntarOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);

    try {
      // Cek koneksi printer terlebih dahulu
      bluetoothSerial.isConnected(
        async () => {
          // console.log removed('[DEBUG] Printer sudah terkoneksi, langsung print nota antar...');
          // Langsung print nota antar tanpa preview
          const notaAntarData = await generateNotaAntarData(order, businessProfile, tenantStatus);
          bluetoothSerial.write(
            notaAntarData,
            () => {
              // console.log removed('[DEBUG] Nota antar berhasil di-print');
              toast({ 
                title: "Berhasil", 
                description: "Nota antar berhasil di-print", 
                variant: "default" 
              });
              setLoading(false);
              if (onSuccess) onSuccess();
            },
            (error: any) => {
              // console.error removed('[DEBUG] Gagal print nota antar:', error);
              toast({ 
                title: "Gagal print nota antar", 
                description: "Gagal mencetak nota antar. Silakan coba lagi.", 
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
      // console.error removed('[DEBUG] Error saat mencetak nota antar:', error);
      toast({ 
        title: "Gagal", 
        description: "Terjadi kesalahan saat mencetak nota antar", 
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
    options: PrintNotaAntarOptions = {}
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
          // Generate and print nota antar
          const notaAntarData = await generateNotaAntarData(order, businessProfile, tenantStatus);
          bluetoothSerial.write(
            notaAntarData,
            () => {
              // console.log removed('[DEBUG] Nota antar berhasil di-print');
              toast({ 
                title: "Berhasil", 
                description: "Nota antar berhasil di-print", 
                variant: "default" 
              });
              setLoading(false);
              if (options.onSuccess) options.onSuccess();
            },
            (error: any) => {
              // console.error removed('[DEBUG] Gagal print nota antar:', error);
              toast({ 
                title: "Gagal print nota antar", 
                description: "Gagal mencetak nota antar. Silakan coba lagi.", 
                variant: "destructive" 
              });
              setLoading(false);
              if (options.onError) options.onError(error);
            }
          );
        } catch (error) {
          // console.error removed('[DEBUG] Error saat mencetak nota antar:', error);
          toast({ 
            title: "Gagal", 
            description: "Terjadi kesalahan saat mencetak nota antar", 
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
    printNotaAntar,
    scanBluetoothDevices,
    connectToDevice,
    loading,
    scanning,
    availableDevices
  };
};
