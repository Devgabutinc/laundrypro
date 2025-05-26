import { supabase } from "@/integrations/supabase/client";
import domtoimage from 'dom-to-image-more';
import { Directory } from '@capacitor/filesystem';
import { saveFile } from '@/utils/permissionUtils';
import { Capacitor } from '@capacitor/core';

// Fungsi untuk memformat nomor telepon ke format WhatsApp
export const formatPhoneToWa = (phone: string): string => {
  if (!phone) return '';
  
  // Hapus semua karakter non-digit
  let cleaned = phone.replace(/\D/g, '');
  
  // Jika dimulai dengan 0, ganti dengan 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // Jika belum dimulai dengan 62, tambahkan
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned;
  }
  
  return cleaned;
};

// Fungsi untuk mendapatkan ID order yang disingkat
export const getShortOrderId = (id: string) => {
  if (!id) return "-";
  return `ORD#${id.slice(-4)}`;
};

// Teks marketing untuk pengguna free
const MARKETING_TEXT = `

------------------------------
🚀 *Pesan ini dibuat dengan LaundryPro - Aplikasi Manajemen Laundry Terbaik!*

✅ Kelola laundry lebih mudah
✅ Lacak pesanan secara real-time
✅ Kirim notifikasi otomatis ke pelanggan
✅ Laporan keuangan lengkap

📱 Download sekarang di Google Play Store!
https://play.google.com/store/apps/details?id=com.laundrypro.app
------------------------------`;

// Fungsi untuk mengirim pesan WhatsApp update status
export const sendWhatsAppStatusUpdate = async (
  order: any, 
  tenant: any, 
  statusLabels: Record<string, string>,
  toast: any
) => {
  if (!order?.customers?.phone) {
    toast({
      title: "Nomor HP tidak tersedia",
      description: "Nomor HP pelanggan tidak ditemukan",
      variant: "destructive"
    });
    return;
  }

  // Ambil template notifikasi dari database jika ada
  let message = '';
  let template = '';
  try {
    const { data: templates, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('business_id', order.business_id)
      .eq('name', order.status)
      .limit(1);
    if (!error && templates && templates.length > 0) {
      template = templates[0].template;
    }
  } catch (e) {}

  // Fungsi substitusi variabel
  const shortOrderId = getShortOrderId(order.id);
  const statusLabel = statusLabels[order.status] || order.status;
  const estimasi = order.estimated_completion ? new Date(order.estimated_completion).toLocaleString("id-ID") : "-";
  const tanggal = order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID") : "-";
  const telpon = order.customers?.phone || "-";
  const alamat = order.customers?.address || order.customers?.alamat || "-";
  const namacs = order.customers?.name || "-";
  const namatoko = tenant?.businessName || "LaundryPro";

  const substitute = (tpl: string) => tpl
    .replace(/\(namacs\)/gi, namacs)
    .replace(/\(noorder\)/gi, shortOrderId)
    .replace(/\(namatoko\)/gi, namatoko)
    .replace(/\(status\)/gi, statusLabel)
    .replace(/\(estimasi\)/gi, estimasi)
    .replace(/\(tanggal\)/gi, tanggal)
    .replace(/\(telpon\)/gi, telpon)
    .replace(/\(alamat\)/gi, alamat);

  if (template) {
    message = substitute(template);
  } else {
    // Template default
    message = `*Update Progress Laundry*\n\n` +
      `Halo ${namacs},\n` +
      `Status pesanan Anda saat ini: *${statusLabel}*\n\n` +
      `Detail Pesanan:\n` +
      `ID: ${shortOrderId}\n` +
      `Tanggal: ${tanggal}\n\n` +
      `Terima kasih telah menggunakan layanan kami.`;
  }
  
  // Tambahkan teks marketing untuk pengguna free
  if (tenant?.status !== 'premium') {
    message += MARKETING_TEXT;
  }

  const phone = formatPhoneToWa(order.customers.phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  
  // Tampilkan toast sukses
  toast({
    title: "WhatsApp dibuka",
    description: "Pesan status telah disiapkan di WhatsApp"
  });
};

// Fungsi untuk mengirim pesan WhatsApp kustom
// Fungsi untuk mengirim pesan WhatsApp dengan format lengkap untuk pesanan
export const sendOrderDetailsWhatsApp = (
  order: any,
  tenant: any,
  toast: any,
  statusLabels: Record<string, string>
) => {
  if (!order?.customers?.phone) {
    toast({
      title: "Nomor HP tidak tersedia",
      description: "Nomor HP pelanggan tidak ditemukan",
      variant: "destructive"
    });
    return;
  }

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
  
  // Tambahkan teks marketing untuk pengguna free
  if (tenant?.status !== 'premium') {
    msg += MARKETING_TEXT;
  }
  
  const phone = formatPhoneToWa(order.customers.phone);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
  
  // Tampilkan toast sukses
  toast({
    title: "WhatsApp dibuka",
    description: "Detail pesanan telah disiapkan di WhatsApp"
  });
};

// Función para compartir struk como imagen por WhatsApp
export const sendReceiptAsImage = async (
  node: HTMLElement,
  tenant: any,
  toast: any,
  onComplete?: () => void
) => {
  if (!node) {
    toast({ title: "Error", description: "No se encontró el struk para capturar" });
    return;
  }

  try {
    // Generar imagen del struk
    const dataUrl = await domtoimage.toPng(node);
    
    // Verificar si estamos en plataforma nativa (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      // Verificar si el plugin SocialSharing está disponible
      if (typeof window !== 'undefined' && window.plugins && window.plugins.socialsharing) {
        const phone = formatPhoneToWa(tenant?.phone || '');
        
        try {
          // Si necesitamos guardar la imagen antes de compartir
          if (dataUrl.startsWith('data:image')) {
            const base64Data = dataUrl.split(',')[1];
            const fileName = `struk_laundry_${new Date().getTime()}.png`;
            const mimeType = 'image/png';
            
            // Guardar en caché interno (no requiere permisos especiales)
            await saveFile(fileName, base64Data, Directory.Cache, mimeType);
          }
          
          // Compartir vía WhatsApp
          window.plugins.socialsharing.shareViaWhatsApp(
            'Berikut struk laundry Anda',
            dataUrl,
            phone || undefined,
            () => {
              if (onComplete) onComplete();
            },
            (err: any) => { 
              toast({ title: "Error al compartir", description: err?.message || String(err) });
              if (onComplete) onComplete();
            }
          );
        } catch (shareErr) {
          console.error('Error al guardar/compartir imagen:', shareErr);
          toast({ 
            title: "Error al compartir", 
            description: "Ocurrió un error al intentar compartir vía WhatsApp. Inténtelo más tarde."
          });
          if (onComplete) onComplete();
        }
      } else {
        toast({ title: "Plugin no disponible", description: "Plugin SocialSharing no encontrado." });
        if (onComplete) onComplete();
      }
    } else {
      // En navegador, usar método de compartir estándar
      if (typeof window !== 'undefined' && window.plugins && window.plugins.socialsharing) {
        const phone = formatPhoneToWa(tenant?.phone || '');
        window.plugins.socialsharing.shareViaWhatsApp(
          'Berikut struk laundry Anda',
          dataUrl,
          phone || undefined,
          () => {
            if (onComplete) onComplete();
          },
          (err: any) => { 
            toast({ title: "Error al compartir", description: err?.message || String(err) });
            if (onComplete) onComplete();
          }
        );
      } else {
        // Fallback para navegador: descargar imagen
        const link = document.createElement('a');
        link.download = `struk_laundry_${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
        toast({ title: "Éxito", description: "Struk descargado correctamente." });
        if (onComplete) onComplete();
      }
    }
  } catch (err) {
    console.error('Error de captura:', err);
    toast({ title: "Error de captura", description: err instanceof Error ? err.message : String(err) });
    if (onComplete) onComplete();
  }
};

export const sendCustomWhatsAppMessage = (
  phone: string,
  message: string,
  toast: any,
  isPremium: boolean = false
) => {
  if (!phone) {
    toast({
      title: "Nomor HP tidak tersedia",
      description: "Nomor HP pelanggan tidak ditemukan",
      variant: "destructive"
    });
    return;
  }
  
  let finalMessage = message;
  
  // Tambahkan teks marketing untuk pengguna free
  if (!isPremium && message.trim() !== '') {
    finalMessage += MARKETING_TEXT;
  }
  
  const formattedPhone = formatPhoneToWa(phone);
  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(finalMessage)}`);
  
  // Tampilkan toast sukses
  toast({
    title: "WhatsApp dibuka",
    description: "Pesan telah disiapkan di WhatsApp"
  });
};
