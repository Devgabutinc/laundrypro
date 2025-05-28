import { toast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { isOnline } from './networkUtils';

// Kunci penyimpanan untuk data pesanan offline
const OFFLINE_ORDERS_KEY = 'laundrypro_offline_orders';

// Interface untuk data pesanan offline
interface OfflineOrder {
  id: string;
  orderData: any;
  createdAt: string;
  synced: boolean;
}

/**
 * Menyimpan pesanan baru saat offline
 * @param orderData Data pesanan yang akan disimpan
 * @returns ID pesanan offline yang dibuat
 */
export const saveOfflineOrder = (orderData: any): string => {
  try {
    // Buat ID unik untuk pesanan offline
    const offlineOrderId = `offline_${uuidv4()}`;
    
    // Buat objek pesanan offline
    const offlineOrder: OfflineOrder = {
      id: offlineOrderId,
      orderData: {
        ...orderData,
        id: offlineOrderId, // Gunakan ID offline sebagai ID pesanan
        status: 'pending_sync', // Status khusus untuk pesanan offline
        created_at: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
      synced: false,
    };
    
    // Ambil data pesanan offline yang sudah ada
    const existingOrdersStr = localStorage.getItem(OFFLINE_ORDERS_KEY);
    const existingOrders: OfflineOrder[] = existingOrdersStr 
      ? JSON.parse(existingOrdersStr) 
      : [];
    
    // Tambahkan pesanan baru ke daftar
    existingOrders.push(offlineOrder);
    
    // Simpan kembali ke localStorage
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(existingOrders));
    
    // Tampilkan notifikasi sukses
    toast({
      title: "Pesanan Disimpan Offline",
      description: "Pesanan akan disinkronkan saat Anda kembali online.",
      variant: "default",
    });
    
    return offlineOrderId;
  } catch (error) {
    console.error('Gagal menyimpan pesanan offline:', error);
    
    // Tampilkan notifikasi error
    toast({
      title: "Gagal Menyimpan Pesanan",
      description: "Terjadi kesalahan saat menyimpan pesanan offline.",
      variant: "destructive",
    });
    
    return '';
  }
};

/**
 * Mendapatkan daftar pesanan offline
 * @returns Daftar pesanan offline
 */
export const getOfflineOrders = (): OfflineOrder[] => {
  try {
    const offlineOrdersStr = localStorage.getItem(OFFLINE_ORDERS_KEY);
    return offlineOrdersStr ? JSON.parse(offlineOrdersStr) : [];
  } catch (error) {
    console.error('Gagal mendapatkan pesanan offline:', error);
    return [];
  }
};

/**
 * Mendapatkan pesanan offline berdasarkan ID
 * @param id ID pesanan offline
 * @returns Data pesanan offline
 */
export const getOfflineOrderById = (id: string): any => {
  try {
    const offlineOrders = getOfflineOrders();
    const order = offlineOrders.find(order => order.id === id);
    return order ? order.orderData : null;
  } catch (error) {
    console.error('Gagal mendapatkan pesanan offline by ID:', error);
    return null;
  }
};

/**
 * Menyinkronkan semua pesanan offline ke server
 * @param syncFunction Fungsi untuk menyinkronkan pesanan ke server
 * @returns Promise yang mengembalikan jumlah pesanan yang berhasil disinkronkan
 */
export const syncOfflineOrders = async (syncFunction: (orderData: any) => Promise<any>): Promise<number> => {
  if (!isOnline()) {
    toast({
      title: "Tidak Ada Koneksi Internet",
      description: "Sinkronisasi pesanan offline membutuhkan koneksi internet.",
      variant: "destructive",
    });
    return 0;
  }
  
  try {
    // Ambil semua pesanan offline
    const offlineOrders = getOfflineOrders();
    
    // Filter pesanan yang belum disinkronkan
    const unsyncedOrders = offlineOrders.filter(order => !order.synced);
    
    if (unsyncedOrders.length === 0) {
      return 0;
    }
    
    // Tampilkan notifikasi proses sinkronisasi dimulai
    toast({
      title: "Sinkronisasi Pesanan",
      description: `Menyinkronkan ${unsyncedOrders.length} pesanan offline...`,
      variant: "default",
    });
    
    let successCount = 0;
    
    // Sinkronkan satu per satu
    for (const order of unsyncedOrders) {
      try {
        // Panggil fungsi sinkronisasi yang disediakan
        await syncFunction(order.orderData);
        
        // Update status pesanan menjadi sudah disinkronkan
        order.synced = true;
        successCount++;
      } catch (error) {
        console.error(`Gagal menyinkronkan pesanan ${order.id}:`, error);
      }
    }
    
    // Simpan kembali status pesanan yang sudah diupdate
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(offlineOrders));
    
    // Tampilkan notifikasi hasil sinkronisasi
    if (successCount > 0) {
      toast({
        title: "Sinkronisasi Selesai",
        description: `Berhasil menyinkronkan ${successCount} dari ${unsyncedOrders.length} pesanan.`,
        variant: "default",
      });
    } else {
      toast({
        title: "Sinkronisasi Gagal",
        description: "Tidak ada pesanan yang berhasil disinkronkan.",
        variant: "destructive",
      });
    }
    
    return successCount;
  } catch (error) {
    console.error('Gagal menyinkronkan pesanan offline:', error);
    
    toast({
      title: "Sinkronisasi Gagal",
      description: "Terjadi kesalahan saat menyinkronkan pesanan offline.",
      variant: "destructive",
    });
    
    return 0;
  }
};

/**
 * Menghapus pesanan offline yang sudah disinkronkan
 * @returns Jumlah pesanan yang dihapus
 */
export const cleanupSyncedOfflineOrders = (): number => {
  try {
    // Ambil semua pesanan offline
    const offlineOrders = getOfflineOrders();
    
    // Filter pesanan yang belum disinkronkan
    const unsyncedOrders = offlineOrders.filter(order => !order.synced);
    
    // Hitung jumlah pesanan yang akan dihapus
    const deletedCount = offlineOrders.length - unsyncedOrders.length;
    
    // Simpan kembali hanya pesanan yang belum disinkronkan
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(unsyncedOrders));
    
    return deletedCount;
  } catch (error) {
    console.error('Gagal membersihkan pesanan offline:', error);
    return 0;
  }
};
