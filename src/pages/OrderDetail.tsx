import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TenantContext } from "@/contexts/TenantContext";
import { Lock, Download } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import StrukPreview from '@/components/StrukPreview';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { convertImageToEscposBytes } from '@/utils/convertImageToEscposBytes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getShortOrderId } from "@/lib/utils";
import { App as CapApp } from '@capacitor/app';
import { usePrintStruk } from '@/hooks/usePrintStruk';
import { usePrintLabel } from '@/hooks/usePrintLabel';
import { usePrintNotaAntar } from '@/hooks/usePrintNotaAntar';
import { usePrintPDF } from '@/hooks/usePrintPDF';
import { sendWhatsAppStatusUpdate, formatPhoneToWa } from '@/utils/whatsAppUtils';

// Declare bluetoothSerial
declare var bluetoothSerial: any;

// Tambahan untuk menghindari error linter pada window.plugins
// @ts-ignore
declare global {
  interface Window {
    plugins?: any;
  }
}

// Helper function to check if user can access a feature based on tenant status
function canAccessFeature(featureName: string, tenantStatus: string, featureSettings: any[]): boolean {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";
  const [showShareWAPreview, setShowShareWAPreview] = useState(false);
  const [showBluetoothModal, setShowBluetoothModal] = useState(false);
  const [showLabelBluetoothModal, setShowLabelBluetoothModal] = useState(false);
  const [showNotaAntarBluetoothModal, setShowNotaAntarBluetoothModal] = useState(false);
  const [rackLocation, setRackLocation] = useState<string>('');
  const [showRackSelector, setShowRackSelector] = useState(false);
  const [rackSlot, setRackSlot] = useState<{rackName: string, position: string} | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{id: string, name: string}[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [featureSettings, setFeatureSettings] = useState<any[]>([]);
  const [featureSettingsLoaded, setFeatureSettingsLoaded] = useState(false);
  const backHandlerRef = useRef<any>(null);
  
  // Hook untuk cetak struk
  const { 
    printStruk, 
    scanBluetoothDevices: scanPrinters, 
    connectToDevice, 
    loading: printLoading, 
    scanning: scanningPrinters, 
    availableDevices: availablePrinters 
  } = usePrintStruk();
  
  // Hook untuk cetak label
  const {
    printLabel,
    scanBluetoothDevices: scanLabelPrinters,
    connectToDevice: connectLabelDevice,
    loading: labelPrintLoading,
    scanning: scanningLabelPrinters,
    availableDevices: availableLabelPrinters
  } = usePrintLabel();
  
  // Hook untuk cetak nota antar
  const {
    printNotaAntar,
    scanBluetoothDevices: scanNotaAntarPrinters,
    connectToDevice: connectNotaAntarDevice,
    loading: notaAntarPrintLoading,
    scanning: scanningNotaAntarPrinters,
    availableDevices: availableNotaAntarPrinters
  } = usePrintNotaAntar();
  
  // Hook untuk cetak PDF
  const {
    downloadPDF,
    loading: pdfLoading
  } = usePrintPDF();

  // Status label dan urutan
  const statusLabels: Record<string, string> = {
    received: 'Belum Dicuci',
    washing: 'Di Cuci',
    ironing: 'Di Setrika',
    ready: 'Siap Diambil',
    completed: 'Selesai',
    cancelled: 'Batal',
  };
  const statusOrder: string[] = ['received', 'washing', 'ironing', 'ready', 'completed'];

  useEffect(() => {
    fetchOrderDetail();
    // eslint-disable-next-line
  }, [orderId]);

  useEffect(() => {
    if (order?.id) {
      fetchRackSlot();
    }
    // eslint-disable-next-line
  }, [order?.id]);

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

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      setLoadingSlots(true);
      if (!order?.business_id) return setLoadingSlots(false);
      const { data, error } = (await supabase
        .from('rack_slots')
        .select('id, position, rack_id, occupied, racks(name)')
        .eq('business_id', order.business_id)
        .eq('occupied', false)
        .order('position')) as any;
      if (!error && data) {
        const slotList = data.map((slot: any) => ({
          id: slot.id,
          name: `${slot.racks?.name || ''} ${slot.position}`.trim()
        }));
        setAvailableSlots(slotList);
      }
      setLoadingSlots(false);
    };
    fetchAvailableSlots();
  }, [order?.business_id, showRackSelector]);

  useEffect(() => {
    CapApp.addListener('backButton', () => {
      navigate('/orders');
    }).then((handler) => {
      backHandlerRef.current = handler;
    });
    return () => {
      if (backHandlerRef.current && backHandlerRef.current.remove) {
        backHandlerRef.current.remove();
      }
    };
  }, [navigate]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      // Ambil data order, customer, dan item
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select(`*, customers(*), order_items(*)`)
        .eq("id", orderId)
        .single();
      if (orderError) throw orderError;
      setOrder(orderData);
    } catch (error: any) {
      toast({ title: "Gagal memuat detail order", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchRackSlot = async () => {
    if (!order?.id) return;
    const { data, error } = await supabase
      .from('rack_slots')
      .select('id, position, racks(name)')
      .eq('order_id', order.id)
      .eq('occupied', true)
      .single();
    if (!error && data) {
      setRackSlot({
        rackName: data.racks?.name || '',
        position: data.position || ''
      });
    } else {
      setRackSlot(null);
    }
  };

  const handlePrint = async () => {
    if (!order || !tenant) return;
    
    // Mapping order untuk format yang diharapkan oleh usePrintStruk
    const mappedOrder = {
      id: order.id,
      shortId: getShortOrderId(order.id),
      customerName: order.customers?.name || "-",
      customerPhone: order.customers?.phone || "-",
      customerAddress: order.customers?.address || "-",
      cashierName: order.cashier_name || "-",
      items: (order.order_items || []).map((item: any) => ({
        name: item.service_name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.total_price || 0,
      discount: order.discount || 0,
      total: (order.total_price || 0) - (order.discount || 0),
      paymentMethod: order.payment_method || "Tunai",
      amountReceived: order.amount_received || order.total_price || 0,
      change: order.change || 0,
      date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
      isPriority: order.is_priority || false,
      deliveryType: order.delivery_type || "-",
      statusHistory: order.status_history?.map((sh: any) => ({
        status: sh.status,
        timestamp: new Date(sh.timestamp).toLocaleString("id-ID")
      })) || []
    };
    
    // Cek koneksi printer terlebih dahulu
    bluetoothSerial.isConnected(
      async () => {
        console.log('[DEBUG] Printer sudah terkoneksi, langsung print...');
        try {
          // Gunakan hook usePrintStruk untuk mencetak struk
          printStruk(
            mappedOrder,
            tenant,
            tenantStatus,
            { 
              paperSize: '58mm',
              onSuccess: () => {
                console.log('[DEBUG] Struk berhasil di-print');
              },
              onError: (error) => {
                console.error('[DEBUG] Gagal print struk:', error);
                setShowBluetoothModal(true);
              }
            }
          );
        } catch (error) {
          console.error('[DEBUG] Error saat mencetak:', error);
          setShowBluetoothModal(true);
        }
      },
      () => {
        console.log('[DEBUG] Printer belum terkoneksi, tampilkan modal scan');
        setShowBluetoothModal(true);
      }
    );
  };

  // Fungsi generate struk teks untuk WA
  function generateStrukText(order: any, tenant: any) {
    const line = '==============================';
    let text = '';
    text += `🧺 *${tenant?.businessName || 'Laundry'}*\n`;
    text += `${tenant?.address || '-'}\n`;
    text += `Telp: ${tenant?.phone || '-'}\n`;
    text += `${line}\n`;
    text += `👤 *Nama:* ${order?.customers?.name || '-'}\n`;
    text += `📱 *No HP:* ${order?.customers?.phone || '-'}\n`;
    text += `🚚 *Jemput/Antar:* ${order?.delivery_type === 'customer_come' ? 'Datang Langsung' : (order?.delivery_type || '-')}\n`;
    if (order?.is_priority) {
      text += `⭐ *Prioritas:* Ya\n`;
    }
    text += `⏰ *Estimasi:* ${order?.estimated_completion ? new Date(order.estimated_completion).toLocaleString('id-ID') : '-'}\n`;
    text += `${line}\n`;
    text += ` *No Order:* ${getShortOrderId(order?.id) || '-'}\n`;
    text += ` *Kasir:* ${order?.cashier_name || '-'}\n`;
    text += `${line}\n`;
    text += `*Item | Qty | Harga*\n`;
    if (order?.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item: any) => {
        text += `• ${item.service_name} | ${item.quantity} | Rp${item.price.toLocaleString('id-ID')}\n`;
      });
    }
    text += `${line}\n`;
    text += `Subtotal: Rp${order?.total_price?.toLocaleString('id-ID') || '0'}\n`;
    if (order?.discount) text += `Diskon: Rp${order.discount.toLocaleString('id-ID')}\n`;
    text += `Total: Rp${(order?.total_price - (order?.discount || 0)).toLocaleString('id-ID')}\n`;
    if (order?.amount_received) text += `Bayar: Rp${order.amount_received.toLocaleString('id-ID')}\n`;
    if (order?.change) text += `Kembali: Rp${order.change.toLocaleString('id-ID')}\n`;
    text += `${line}\n`;
    text += `🙏 Terima kasih atas kepercayaan Anda!\n`;
    text += `Info & tracking: ${tenant?.phone ? 'WA ' + tenant.phone : '-'}\n`;
    return text;
  }

  // Helper untuk format nomor WA ke 628xxxxxxxxxx
  function formatPhoneToWa(phone: string) {
    if (!phone) return '';
    let p = phone.trim();
    if (p.startsWith('+62')) return p.replace('+', '');
    if (p.startsWith('62')) return p;
    if (p.startsWith('08')) return '62' + p.slice(1);
    return p;
  }

  const handleSendWAText = () => {
    
    if (!order?.customers?.phone) return;
    const line = '------------------------------';
    const businessName = tenant?.businessName || 'LaundryPro';
    const alamat = tenant?.address || '-';
    const telp = tenant?.phone || '-';
    const statusLabel = statusLabels[order.status] || order.status;
    const estimasi = order.estimated_completion ? new Date(order.estimated_completion).toLocaleString('id-ID') : '-';
    const antarJemput = order.delivery_type === 'customer_come' ? 'Datang Langsung' : (order.delivery_type || '-');
    let msg = '';
    msg += `🧺 *${businessName}*\n`;
    msg += `${line}\n`;
    msg += `👋 Halo ${order.customers?.name || '-'}, terima kasih telah order di ${businessName}!\n`;
    msg += `Berikut adalah informasi pesanan Anda saat ini:`;
    msg += `\n${line}`;
    msg += `\n📝 No Order         : ${getShortOrderId(order?.id) || '-'}`;
    msg += `\n👤 Nama Pelanggan   : ${order.customers?.name || '-'}`;
    msg += `\n📱 No HP            : ${order.customers?.phone || '-'}`;
    msg += `\n🚚 Jemput/Antar     : ${antarJemput}`;
    msg += `\n⏰ Estimasi Selesai : ${estimasi}`;
    msg += `\n📦 Status Pesanan   : ${statusLabel}`;
    msg += `\n${line}`;
    
    // Tambah progres status
    if (order?.status_history && Array.isArray(order.status_history) && order.status_history.length > 0) {
      msg += `\n🔄 Progres Order:`;
      order.status_history.forEach((s: any) => {
        const tgl = s.timestamp ? new Date(s.timestamp).toLocaleString('id-ID') : '-';
        const label = statusLabels[s.status] || s.status;
        msg += `\n- ${tgl}: ${label}`;
      });
      msg += `\n${line}`;
    }
    msg += `\n🧾 Daftar Item:`;
    if (order?.order_items && Array.isArray(order.order_items)) {
      order.order_items.forEach((item: any) => {
        msg += `\n- ${item.service_name} (${item.quantity}x) - Rp${item.price.toLocaleString('id-ID')}`;
      });
    }
    msg += `\n${line}`;
    msg += `\n💵 Subtotal : Rp${order?.total_price?.toLocaleString('id-ID') || '0'}`;
    if (order?.discount) msg += `\n🏷️ Diskon   : Rp${order.discount.toLocaleString('id-ID')}`;
    msg += `\n🧮 Total    : Rp${(order?.total_price - (order?.discount || 0)).toLocaleString('id-ID')}`;
    if (order?.amount_received) msg += `\n💰 Bayar    : Rp${order.amount_received.toLocaleString('id-ID')}`;
    if (order?.change) msg += `\n💸 Kembali  : Rp${order.change.toLocaleString('id-ID')}`;
    msg += `\n${line}`;
    msg += `\n🙏 Terima kasih atas kepercayaan Anda. Jika ada pertanyaan, silakan hubungi kami di WA ${telp}.`;
    if (tenant?.status !== 'premium') {
      msg += "\n\nby LaundryPro - Download sekarang di Playstore";
    }
    const phone = formatPhoneToWa(order.customers.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  };

  const handleShowShareWAPreview = () => {
    setShowShareWAPreview(true);
  };

  const handleSendWAScreenshot = async () => {
    // Ambil screenshot hanya area struk (bukan seluruh modal)
    const node = document.querySelector('#struk-preview .struk-area') as HTMLElement;
    if (!node) {
      toast({ title: "Gagal", description: "Struk tidak ditemukan untuk di-screenshot." });
      return;
    }
    try {
      const domtoimage: typeof import('dom-to-image-more') = await import('dom-to-image-more');
      const dataUrl = await domtoimage.toPng(node);
      
      // Jika di platform mobile (Android/iOS)
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        // Cek apakah plugin SocialSharing tersedia
        if (typeof window !== 'undefined' && window.plugins && window.plugins.socialsharing) {
          const phone = formatPhoneToWa(tenant?.phone || '');
          
          // Simpan screenshot ke penyimpanan lokal terlebih dahulu jika diperlukan
          try {
            // Jika perlu menyimpan gambar sebelum share
            if (dataUrl.startsWith('data:image')) {
              const { saveFile, getMimeType } = await import('@/utils/permissionUtils');
              const base64Data = dataUrl.split(',')[1];
              const fileName = `struk_laundry_${new Date().getTime()}.png`;
              const mimeType = 'image/png';
              
              // Simpan ke cache internal (tidak perlu permission khusus)
              const { Directory } = await import('@capacitor/filesystem');
              await saveFile(fileName, base64Data, Directory.Cache, mimeType);
            }
            
            // Share via WhatsApp
            window.plugins.socialsharing.shareViaWhatsApp(
              'Berikut struk laundry Anda',
              dataUrl,
              phone || undefined,
              () => {},
              (err: any) => { toast({ title: "Gagal share WA", description: err?.message || String(err) }); }
            );
          } catch (shareErr) {
            console.error('Error saat menyimpan/share gambar:', shareErr);
            toast({ 
              title: "Gagal share", 
              description: "Terjadi kesalahan saat mencoba share via WhatsApp. Coba lagi nanti."
            });
          }
        } else {
          toast({ title: "Plugin tidak tersedia", description: "Plugin SocialSharing tidak ditemukan." });
        }
      } else {
        // Di browser, gunakan metode share standar
        if (typeof window !== 'undefined' && window.plugins && window.plugins.socialsharing) {
          const phone = formatPhoneToWa(tenant?.phone || '');
          window.plugins.socialsharing.shareViaWhatsApp(
            'Berikut struk laundry Anda',
            dataUrl,
            phone || undefined,
            () => {},
            (err: any) => { toast({ title: "Gagal share WA", description: err?.message || String(err) }); }
          );
        } else {
          // Fallback untuk browser: download gambar
          const link = document.createElement('a');
          link.download = `struk_laundry_${new Date().getTime()}.png`;
          link.href = dataUrl;
          link.click();
          toast({ title: "Berhasil", description: "Struk berhasil didownload." });
        }
      }
      
      // Tutup modal setelah share
      setShowShareWAPreview(false);
    } catch (err) {
      console.error('Error screenshot:', err);
      toast({ title: "Gagal screenshot", description: err instanceof Error ? err.message : String(err) });
      setShowShareWAPreview(false);
    }
  };

  const handlePrintLabel = () => {
    if (!order || !tenant) return;
    
    // Mapping order untuk format yang diharapkan oleh usePrintLabel
    const mappedOrder = {
      id: order.id,
      shortId: getShortOrderId(order.id),
      customerName: order.customers?.name || "-",
      customerPhone: order.customers?.phone || "-",
      note: order.note || "",
      items: (order.order_items || []).map((item: any) => ({
        name: item.service_name,
        quantity: item.quantity,
        price: item.price,
      })),
      total: (order.total_price || 0) - (order.discount || 0),
      paymentStatus: order.payment_status || "Belum Dibayar",
      date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
    };
    
    // Cek koneksi printer terlebih dahulu
    bluetoothSerial.isConnected(
      async () => {
        console.log('[DEBUG] Printer sudah terkoneksi, langsung print label...');
        try {
          // Gunakan hook usePrintLabel untuk mencetak label
          printLabel(
            mappedOrder,
            tenant,
            tenantStatus,
            { 
              paperSize: '58mm',
              onSuccess: () => {
                console.log('[DEBUG] Label berhasil di-print');
              },
              onError: (error) => {
                console.error('[DEBUG] Gagal print label:', error);
                setShowLabelBluetoothModal(true);
              }
            }
          );
        } catch (error) {
          console.error('[DEBUG] Error saat mencetak label:', error);
          setShowLabelBluetoothModal(true);
        }
      },
      () => {
        console.log('[DEBUG] Printer belum terkoneksi, tampilkan modal scan');
        setShowLabelBluetoothModal(true);
      }
    );
  };

  const handlePrintNotaAntar = () => {
    if (!order || !tenant) return;
    
    // Mapping order untuk format yang diharapkan oleh usePrintNotaAntar
    const mappedOrder = {
      id: order.id,
      shortId: getShortOrderId(order.id),
      customerName: order.customers?.name || "-",
      customerPhone: order.customers?.phone || "-",
      customerAddress: order.customers?.address || "-",
      items: (order.order_items || []).map((item: any) => ({
        name: item.service_name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.total_price || 0,
      discount: order.discount || 0,
      total: (order.total_price || 0) - (order.discount || 0),
      paymentMethod: order.payment_method || "Tunai",
      paymentStatus: order.payment_status || "Belum Dibayar",
      date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
      deliveryType: order.delivery_type || "-",
      deliveryFee: order.delivery_fee || 0,
      note: order.note || ""
    };
    
    // Cek koneksi printer terlebih dahulu
    bluetoothSerial.isConnected(
      async () => {
        console.log('[DEBUG] Printer sudah terkoneksi, langsung print nota antar...');
        try {
          // Gunakan hook usePrintNotaAntar untuk mencetak nota antar
          printNotaAntar(
            mappedOrder,
            tenant,
            tenantStatus,
            { 
              paperSize: '58mm',
              onSuccess: () => {
                console.log('[DEBUG] Nota antar berhasil di-print');
              },
              onError: (error) => {
                console.error('[DEBUG] Gagal print nota antar:', error);
                setShowNotaAntarBluetoothModal(true);
              }
            }
          );
        } catch (error) {
          console.error('[DEBUG] Error saat mencetak nota antar:', error);
          setShowNotaAntarBluetoothModal(true);
        }
      },
      () => {
        console.log('[DEBUG] Printer belum terkoneksi, tampilkan modal scan');
        setShowNotaAntarBluetoothModal(true);
      }
    );
  };

  const handlePrintPDF = () => {
    if (!order || !tenant) return;
    
    // Mapping order untuk format yang diharapkan oleh usePrintPDF
    const mappedOrder = {
      id: order.id,
      shortId: getShortOrderId(order.id),
      customerName: order.customers?.name || "-",
      customerPhone: order.customers?.phone || "-",
      customerAddress: order.customers?.address || "-",
      cashierName: order.cashier_name || "-",
      items: (order.order_items || []).map((item: any) => ({
        name: item.service_name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.total_price || 0,
      discount: order.discount || 0,
      total: (order.total_price || 0) - (order.discount || 0),
      paymentMethod: order.payment_method || "Tunai",
      paymentStatus: order.payment_status || "Belum Dibayar",
      amountReceived: order.amount_received || order.total_price || 0,
      change: order.change || 0,
      date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
      isPriority: order.is_priority || false,
      deliveryType: order.delivery_type || "-",
      statusHistory: order.status_history?.map((sh: any) => ({
        status: sh.status,
        timestamp: new Date(sh.timestamp).toLocaleString("id-ID")
      })) || []
    };
    
    // Download PDF
    downloadPDF(
      mappedOrder,
      tenant,
      tenantStatus,
      {
        onSuccess: () => {
          console.log('[DEBUG] PDF berhasil diunduh/disimpan');
        },
        onError: (error) => {
          console.error('[DEBUG] Gagal mengunduh/menyimpan PDF:', error);
        }
      }
    );
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
      toast({ title: "Status order diperbarui", description: `Status diubah ke ${newStatus}` });
      fetchOrderDetail();
    } catch (error: any) {
      toast({ title: "Gagal update status", description: error.message, variant: "destructive" });
    } finally {
      setStatusLoading(false);
    }
  };

  const scanBluetoothDevices = async () => {
    scanPrinters();
  };

  const handleConnectToDevice = (device: any) => {
    if (!order || !tenant) return;
    
    // Mapping order untuk format yang diharapkan oleh usePrintStruk
    const mappedOrder = {
      id: order.id,
      shortId: getShortOrderId(order.id),
      customerName: order.customers?.name || "-",
      customerPhone: order.customers?.phone || "-",
      cashierName: order.cashier_name || "-",
      items: (order.order_items || []).map((item: any) => ({
        name: item.service_name,
        quantity: item.quantity,
        price: item.price,
      })),
      subtotal: order.total_price || 0,
      discount: order.discount || 0,
      total: (order.total_price || 0) - (order.discount || 0),
      paymentMethod: order.payment_method || "Tunai",
      amountReceived: order.amount_received || order.total_price || 0,
      change: order.change || 0,
      date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
      statusHistory: order.status_history?.map((sh: any) => ({
        status: sh.status,
        timestamp: new Date(sh.timestamp).toLocaleString("id-ID")
      })) || []
    };
    
    connectToDevice(
      device,
      mappedOrder,
      tenant,
      tenantStatus,
      { 
        width: '58mm',
        onSuccess: () => {
          setShowBluetoothModal(false);
        }
      }
    );
  };

  const handleUpdateRackLocation = async (newSlotId: string) => {
    try {
      // Kosongkan slot lama (jika ada)
      if (order?.id) {
        await supabase
          .from('rack_slots')
          .update({ occupied: false, order_id: null, assigned_at: null, due_date: null })
          .eq('order_id', order.id)
          .eq('occupied', true);
      }
      // Assign slot baru
      await supabase
        .from('rack_slots')
        .update({ order_id: order.id, occupied: true, assigned_at: new Date().toISOString() })
        .eq('id', newSlotId);

      setOrder({ ...order }); // update state biar fetchRackSlot jalan
      setRackLocation(newSlotId);
      toast({
        title: "Berhasil",
        description: "Lokasi rak berhasil diperbarui",
        variant: "default"
      });
      fetchRackSlot(); // refresh tampilan
    } catch (error: any) {
      toast({
        title: "Gagal",
        description: "Gagal memperbarui lokasi rak: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleUpdateProgressWA = async () => {
    // Menggunakan fungsi dari whatsAppUtils.ts untuk mengirim update status via WhatsApp
    sendWhatsAppStatusUpdate(order, tenant, statusLabels, toast);
  };

  const handleCancelOrder = async () => {
    try {
      // Update status order ke cancelled
      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', orderId);
      // Update status history
      await supabase.from('order_status_history').insert({ order_id: orderId, status: 'cancelled', updated_by: order?.updated_by || null, business_id: order?.business_id });
      // Update/cancel transaksi income terkait
      await supabase.from('transactions').update({ status: 'cancelled' }).eq('related_order_id', orderId);
      // Kosongkan slot rak jika ada
      const { data: slots } = await supabase.from('rack_slots').select('*').eq('order_id', orderId).eq('occupied', true);
      for (const slot of slots || []) {
        await supabase.from('rack_slots').update({ occupied: false, order_id: null, assigned_at: null, due_date: null }).eq('id', slot.id);
      }
      toast({ title: 'Pesanan dibatalkan', description: 'Pesanan berhasil dibatalkan.', variant: 'default' });
      fetchOrderDetail();
    } catch (err: any) {
      toast({ title: 'Gagal membatalkan pesanan', description: err.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!order) return <div className="p-8 text-center">Order tidak ditemukan</div>;

  return (
    <Card className="rounded-xl shadow-lg border-0 bg-white max-w-screen-sm mx-auto px-2 w-full">
      <CardHeader className="bg-orange-50 rounded-t-xl border-b flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-2xl font-bold text-orange-700 flex items-center gap-2 mb-0">
            <span>Detail Order</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-gray-200 text-gray-500' : 'bg-orange-100 text-orange-700'}`}>{statusLabels[order.status] || order.status}</span>
          </CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pos')}>
            Kembali
          </Button>
          <Button onClick={handleUpdateProgressWA}>
            Update Progress via WA
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2 text-base">
          <div className="font-semibold">ID Order:</div>
          <div className="text-orange-600">{getShortOrderId(order.id)}</div>
          <div>Nama:</div>
          <div><b>{order.customers?.name}</b></div>
          <div>No HP:</div>
          <div>{order.customers?.phone}</div>
          <div>Prioritas:</div>
          <div>{order.is_priority ? 'Ya' : 'Tidak'}</div>
          <div>Estimasi Selesai:</div>
          <div>{order.estimated_completion ? new Date(order.estimated_completion).toLocaleString('id-ID') : '-'}</div>
          <div>Jemput/Antar:</div>
          <div>{order.delivery_type === 'customer_come' ? 'Datang Langsung' : (order.delivery_type || '-')}</div>
          <div>Rak:</div>
          <div>
            {rackSlot ? (
              <span className="text-sm font-semibold text-green-700">{rackSlot.rackName} {rackSlot.position}</span>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRackSelector(true)}
                  className="mt-1"
                  disabled={!canUseRacks}
                >
                  Pilih Rak
                </Button>
                {!canUseRacks && (
                  <div className="flex items-center text-xs text-amber-600 mt-1">
                    <Lock className="h-3 w-3 mr-1" />
                    <span>Fitur Premium</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mb-4">
          <div className="font-semibold mb-2">Daftar Item:</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.order_items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.service_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>Rp {item.price.toLocaleString("id-ID")}</TableCell>
                  <TableCell>Rp {(item.price * item.quantity).toLocaleString("id-ID")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Section tombol aksi */}
        <div className="mb-4">
          <div className="font-semibold text-gray-600 mb-2">Aksi Order</div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <Button onClick={handlePrint} variant="outline">Print Struk</Button>
            <Button onClick={handleSendWAText} variant="outline">WA (Teks)</Button>
            <Button onClick={handleShowShareWAPreview} variant="outline">Struk WA (Gambar)</Button>
            <Button onClick={handlePrintLabel} variant="outline">Cetak Label</Button>
            <Button onClick={handlePrintNotaAntar} variant="outline">Nota Antar</Button>
            <Button onClick={handlePrintPDF} variant="outline" disabled={pdfLoading}>
              {pdfLoading ? 'Menyiapkan PDF...' : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Struk PDF
                </>
              )}
            </Button>
          </div>  
        </div>
        {/* Section tombol status */}
        <div className="mb-2 pt-2 border-t">
          <div className="font-semibold text-gray-600 mb-2">Update Status</div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            {statusOrder.map((s, idx) => (
              <Button
                key={s}
                size="sm"
                disabled={
                  statusLoading ||
                  order.status === s ||
                  statusOrder.indexOf(order.status) > idx ||
                  (s === 'completed' && order.payment_status !== 'paid')
                }
                onClick={() => handleUpdateStatus(s)}
                variant={order.status === s ? "default" : "outline"}
                className="min-w-[110px]"
              >
                {statusLabels[s]}
              </Button>
            ))}
            {order.status === 'received' && (
              <Button size="sm" disabled={statusLoading} onClick={handleCancelOrder} variant="destructive" className="min-w-[110px]">Batal</Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div></div>
        </div>
      </CardContent>

      {/* Dialog untuk preview struk WA */}
      <Dialog open={showShareWAPreview} onOpenChange={setShowShareWAPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Preview Struk WhatsApp</DialogTitle>
          </DialogHeader>
          {order && tenant && (
            <StrukPreview 
              order={{
                id: getShortOrderId(order.id),
                customerName: order.customers?.name || "-",
                customerPhone: order.customers?.phone || "-",
                items: (order.order_items || []).map((item: any) => ({
                  name: item.service_name,
                  quantity: item.quantity,
                  price: item.price,
                })),
                subtotal: order.total_price || 0,
                discount: order.discount || 0,
                total: (order.total_price || 0) - (order.discount || 0),
                paymentMethod: order.payment_method || "Tunai",
                amountReceived: order.amount_received || order.total_price || 0,
                change: order.change || 0,
                date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
                statusHistory: order.status_history?.map((sh: any) => ({
                  status: sh.status,
                  timestamp: new Date(sh.timestamp).toLocaleString("id-ID")
                })) || []
              }}
              businessProfile={tenant}
              tenantStatus={tenantStatus}
              onShare={handleSendWAScreenshot}
              onCancel={() => setShowShareWAPreview(false)}
              shareButtonLabel="Bagikan via WhatsApp"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog untuk pilih printer label */}
      <Dialog open={showLabelBluetoothModal} onOpenChange={setShowLabelBluetoothModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Printer untuk Label</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Button 
              onClick={() => scanLabelPrinters()} 
              disabled={scanningLabelPrinters}
              className="w-full mb-4"
            >
              {scanningLabelPrinters ? 'Mencari Printer...' : 'Scan Printer'}
            </Button>
            
            {availableLabelPrinters.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Printer Tersedia:</p>
                {availableLabelPrinters.map((device, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => {
                      // Mapping order untuk format yang diharapkan oleh usePrintLabel
                      const mappedOrder = {
                        id: order.id,
                        shortId: getShortOrderId(order.id),
                        customerName: order.customers?.name || "-",
                        customerPhone: order.customers?.phone || "-",
                        note: order.note || "",
                        items: (order.order_items || []).map((item: any) => ({
                          name: item.service_name,
                          quantity: item.quantity,
                          price: item.price,
                        })),
                        total: (order.total_price || 0) - (order.discount || 0),
                        paymentStatus: order.payment_status || "Belum Dibayar",
                        date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
                        estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
                      };
                      
                      connectLabelDevice(
                        device, 
                        mappedOrder, 
                        tenant, 
                        tenantStatus,
                        {
                          onSuccess: () => {
                            setShowLabelBluetoothModal(false);
                          }
                        }
                      );
                    }}
                    disabled={labelPrintLoading}
                  >
                    {device.name || device.address}
                  </Button>
                ))}
              </div>
            ) : !scanningLabelPrinters && (
              <p className="text-sm text-center text-muted-foreground">Tidak ada printer ditemukan. Silakan scan printer.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowLabelBluetoothModal(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Dialog untuk pilih printer nota antar */}
      <Dialog open={showNotaAntarBluetoothModal} onOpenChange={setShowNotaAntarBluetoothModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pilih Printer untuk Nota Antar</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Button 
              onClick={() => scanNotaAntarPrinters()} 
              disabled={scanningNotaAntarPrinters}
              className="w-full mb-4"
            >
              {scanningNotaAntarPrinters ? 'Mencari Printer...' : 'Scan Printer'}
            </Button>
            
            {availableNotaAntarPrinters.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium mb-2">Printer Tersedia:</p>
                {availableNotaAntarPrinters.map((device, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => {
                      // Mapping order untuk format yang diharapkan oleh usePrintNotaAntar
                      const mappedOrder = {
                        id: order.id,
                        shortId: getShortOrderId(order.id),
                        customerName: order.customers?.name || "-",
                        customerPhone: order.customers?.phone || "-",
                        customerAddress: order.customers?.address || "-",
                        items: (order.order_items || []).map((item: any) => ({
                          name: item.service_name,
                          quantity: item.quantity,
                          price: item.price,
                        })),
                        subtotal: order.total_price || 0,
                        discount: order.discount || 0,
                        total: (order.total_price || 0) - (order.discount || 0),
                        paymentMethod: order.payment_method || "Tunai",
                        paymentStatus: order.payment_status || "Belum Dibayar",
                        date: order.created_at ? new Date(order.created_at).toLocaleString("id-ID") : "-",
                        estimatedCompletion: order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID", { dateStyle: 'short' }) : "-",
                        deliveryType: order.delivery_type || "-",
                        deliveryFee: order.delivery_fee || 0,
                        note: order.note || ""
                      };
                      
                      connectNotaAntarDevice(
                        device, 
                        mappedOrder, 
                        tenant, 
                        tenantStatus,
                        {
                          onSuccess: () => {
                            setShowNotaAntarBluetoothModal(false);
                          }
                        }
                      );
                    }}
                    disabled={notaAntarPrintLoading}
                  >
                    {device.name || device.address}
                  </Button>
                ))}
              </div>
            ) : !scanningNotaAntarPrinters && (
              <p className="text-sm text-center text-muted-foreground">Tidak ada printer ditemukan. Silakan scan printer.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowNotaAntarBluetoothModal(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Scan Bluetooth */}
      <Dialog open={showBluetoothModal} onOpenChange={setShowBluetoothModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pilih Printer Bluetooth</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-end">
              <Button 
                onClick={scanBluetoothDevices} 
                disabled={scanningPrinters}
                variant="outline"
              >
                {scanningPrinters ? 'Mencari...' : 'Scan Ulang'}
              </Button>
            </div>
            <ScrollArea className="h-[300px] rounded-md border p-4">
              {availablePrinters.length === 0 ? (
                <div className="text-center text-gray-500">
                  {scanningPrinters ? 'Mencari device...' : 'Tidak ada device ditemukan'}
                </div>
              ) : (
                <div className="space-y-2">
                  {availablePrinters.map((device) => (
                    <div
                      key={device.address}
                      className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                      onClick={() => handleConnectToDevice(device)}
                    >
                      <div>
                        <div className="font-medium">{device.name || 'Unknown Device'}</div>
                        <div className="text-sm text-gray-500">{device.address}</div>
                        <div className="text-xs text-gray-400">Class: {device.class || 'Unknown'}</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog untuk memilih rak */}
      <Dialog open={showRackSelector} onOpenChange={setShowRackSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Lokasi Rak</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Lokasi Rak</Label>
                {!canUseRacks && (
                  <div className="flex items-center text-xs text-amber-600">
                    <Lock className="h-3 w-3 mr-1" />
                    <span>Fitur Premium</span>
                  </div>
                )}
              </div>
              <Select
                value={rackLocation}
                onValueChange={(value) => {
                  handleUpdateRackLocation(value);
                  setShowRackSelector(false);
                }}
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
                      {availableSlots.map(slot => (
                        <SelectItem key={slot.id} value={slot.id}>{slot.name}</SelectItem>
                      ))}
                      {(!loadingSlots && availableSlots.length === 0) && (
                        <SelectItem value="no_slot" disabled>Tidak ada slot tersedia</SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AutoShareWAStruk({ onReady }: { onReady: () => void }) {
  React.useEffect(() => {
    onReady();
    // eslint-disable-next-line
  }, []);
  return null;
} 