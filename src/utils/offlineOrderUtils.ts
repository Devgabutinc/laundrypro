import { toast } from '@/components/ui/use-toast';
import { isOnline } from './networkUtils';

// Implementasi fungsi UUID internal untuk menghindari masalah build di Vercel
function generateUUID(): string {
  // Implementasi sederhana untuk menghasilkan UUID
  const s: string[] = [];
  const hexDigits = '0123456789abcdef';
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.charAt(Math.floor(Math.random() * 0x10));
  }
  // Bits 12-15 of time_hi_and_version field to 0010
  s[14] = '4';
  // Bits 6-7 of clock_seq_hi_and_reserved to 01
  s[19] = hexDigits.charAt((parseInt(s[19], 16) & 0x3) | 0x8);
  // Menambahkan tanda hubung
  s[8] = s[13] = s[18] = s[23] = '-';
  
  return s.join('');
}

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
    console.log('Starting saveOfflineOrder with data:', orderData);
    
    // Buat ID unik untuk pesanan offline
    const offlineOrderId = `offline_${generateUUID()}`;
    console.log('Generated offline order ID:', offlineOrderId);
    
    // Pastikan orderData memiliki semua properti yang diperlukan
    const safeOrderData = {
      ...orderData,
      id: offlineOrderId, // Gunakan ID offline sebagai ID pesanan
      status: 'pending_sync', // Status khusus untuk pesanan offline
      created_at: new Date().toISOString(),
      customer: orderData.customer || { name: 'Customer Offline', phone: '-', address: '-' },
      items: Array.isArray(orderData.items) ? orderData.items : [],
      payment_method: orderData.payment_method || 'cash',
      business_id: orderData.business_id || '',
      is_offline: true
    };
    
    // Buat objek pesanan offline
    const offlineOrder: OfflineOrder = {
      id: offlineOrderId,
      orderData: safeOrderData,
      createdAt: new Date().toISOString(),
      synced: false,
    };
    
    // Ambil data pesanan offline yang sudah ada
    const existingOrdersStr = localStorage.getItem(OFFLINE_ORDERS_KEY);
    let existingOrders: OfflineOrder[] = [];
    
    try {
      existingOrders = existingOrdersStr ? JSON.parse(existingOrdersStr) : [];
      // Pastikan existingOrders adalah array
      if (!Array.isArray(existingOrders)) {
        console.warn('existingOrders bukan array, mereset ke array kosong');
        existingOrders = [];
      }
    } catch (parseError) {
      console.error('Error parsing existing offline orders:', parseError);
      // Reset ke array kosong jika terjadi error parsing
      existingOrders = [];
    }
    
    console.log('Existing offline orders count:', existingOrders.length);
    
    // Tambahkan pesanan baru ke daftar
    existingOrders.push(offlineOrder);
    
    // Simpan kembali ke localStorage
    const ordersToSave = JSON.stringify(existingOrders);
    localStorage.setItem(OFFLINE_ORDERS_KEY, ordersToSave);
    console.log('Saved offline orders to localStorage, new count:', existingOrders.length);
    
    // Simpan juga pesanan individual untuk akses langsung
    const individualOrderKey = `offline_order_${offlineOrderId}`;
    localStorage.setItem(individualOrderKey, JSON.stringify(offlineOrder));
    console.log('Saved individual offline order to localStorage with key:', individualOrderKey);
    
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
    const orders = offlineOrdersStr ? JSON.parse(offlineOrdersStr) : [];
    // Pastikan hasilnya adalah array
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    console.error('Gagal mendapatkan pesanan offline:', error);
    return [];
  }
};

/**
 * Mendapatkan pesanan offline berdasarkan ID
 * @param orderId ID pesanan offline
 * @returns Pesanan offline atau null jika tidak ditemukan
 */
export const getOfflineOrderById = (orderId: string): OfflineOrder | null => {
  try {
    // Coba ambil dari penyimpanan individual terlebih dahulu (lebih cepat)
    const individualOrderKey = `offline_order_${orderId}`;
    const individualOrderStr = localStorage.getItem(individualOrderKey);
    
    if (individualOrderStr) {
      console.log('Found offline order in individual storage:', orderId);
      return JSON.parse(individualOrderStr);
    }
    
    // Jika tidak ditemukan, cari di daftar pesanan offline
    console.log('Searching for offline order in list:', orderId);
    const orders = getOfflineOrders();
    const order = orders.find(o => o.id === orderId || o.id === `offline_${orderId}` || orderId === `offline_${o.id}`);
    
    if (order) {
      console.log('Found offline order in list:', orderId);
      // Simpan ke penyimpanan individual untuk akses lebih cepat di masa depan
      localStorage.setItem(individualOrderKey, JSON.stringify(order));
    } else {
      console.log('Offline order not found:', orderId);
    }
    
    return order || null;
  } catch (error) {
    console.error('Gagal mendapatkan pesanan offline by ID:', error);
    return null;
  }
};

/**
 * Mendapatkan data pesanan offline berdasarkan ID (hanya data pesanan, bukan objek OfflineOrder)
 * @param id ID pesanan offline
 * @returns Data pesanan offline
 */
export const getOfflineOrderData = (id: string): any => {
  try {
    // Coba ambil dari penyimpanan individual terlebih dahulu
    const individualOrderKey = `offline_order_${id}`;
    const individualOrderStr = localStorage.getItem(individualOrderKey);
    
    if (individualOrderStr) {
      const order = JSON.parse(individualOrderStr);
      return order.orderData;
    }
    
    // Jika tidak ada di penyimpanan individual, cari di daftar
    const offlineOrders = getOfflineOrders();
    const order = offlineOrders.find(order => order.id === id || order.id === `offline_${id}` || id === `offline_${order.id}`);
    return order ? order.orderData : null;
  } catch (error) {
    console.error('Gagal mendapatkan data pesanan offline by ID:', error);
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
