import React, { useState, useEffect, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { TenantContext } from '@/contexts/TenantContext';
import { useFeature } from '@/hooks/useFeature';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

// Define formatCurrency function since it's not in utils.ts
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Add safe Capacitor type definitions
declare global {
  interface Window {
    plugins?: any;
  }
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
  estimated_completion?: string | Date; // Timestamp with time zone dari database
  statusHistory?: { status: string; timestamp: string }[];
}

interface StrukPreviewProps {
  order: OrderData;
  businessProfile: any;
  tenantStatus: string; // 'free' | 'premium' | 'suspended'
  isStrukClean?: boolean;
  onShare?: () => void;
  onCancel?: () => void;
  shareButtonLabel?: string;
  width?: '58mm' | '80mm';
}

// Helper function to format phone number for WhatsApp
const formatPhoneToWa = (phone: string): string => {
  if (!phone) return '';
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  // If it starts with 0, replace with 62
  if (digits.startsWith('0')) {
    return '62' + digits.substring(1);
  }
  // If it doesn't start with 62, add it
  if (!digits.startsWith('62')) {
    return '62' + digits;
  }
  return digits;
};

const StrukPreview: React.FC<StrukPreviewProps> = ({
  order,
  businessProfile,
  tenantStatus,
  onShare,
  onCancel,
  shareButtonLabel = 'Bagikan via WhatsApp',
  width = '58mm'
}) => {
  const { toast } = useToast();
  const { tenant } = useContext(TenantContext);
  const { hasAccess: hasReceiptCustomization } = useFeature('receipt_customization');
  // State untuk menyimpan estimasi yang diformat
  const [formattedEstimation, setFormattedEstimation] = useState<string>('-');
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

  // Format estimasi setiap kali order berubah - menggunakan pendekatan sederhana seperti di OrderDetail.tsx
  useEffect(() => {
    // Gunakan pendekatan sederhana seperti di OrderDetail.tsx
    if (order?.estimated_completion) {
      try {
        // Langsung gunakan toLocaleString tanpa opsi tambahan untuk memastikan konsistensi
        const estimasi = new Date(order.estimated_completion).toLocaleString('id-ID');
        
        if (estimasi !== 'Invalid Date') {
          setFormattedEstimation(estimasi);
        } else {
          setFormattedEstimation(String(order.estimated_completion));
        }
      } catch (e) {
        // Fallback ke string asli jika parsing gagal
        setFormattedEstimation(String(order.estimated_completion));
      }
    } else {
      setFormattedEstimation('-');
    }
  }, [order]);



  useEffect(() => {
    // Load receipt settings from database if available
    const loadReceiptSettings = async () => {
      try {
        if (!hasReceiptCustomization) return;
        
        // Fetch settings from Supabase
        if (businessProfile?.id) {
          // Fetch receipt settings for this business
          
          // Use 'as any' to avoid TypeScript errors with the receipt_settings table
          const { data, error } = await supabase
            .from('receipt_settings' as any)
            .select('*')
            .eq('business_id', businessProfile.id)
            .maybeSingle();
            
          if (error) {
            console.error('Error fetching receipt settings:', error);
            return;
          }
          
          if (data) {

            setReceiptSettings(data);
          } else {
            // No settings found, try localStorage
            // Fallback to localStorage if no database settings
            const settings = localStorage.getItem('receiptSettings');
            if (settings) {
              setReceiptSettings(JSON.parse(settings));
            }
          }
        }
      } catch (error) {
        console.error('Error loading receipt settings:', error);
      }
    };

    loadReceiptSettings();
  }, [hasReceiptCustomization, businessProfile?.id]);

  // Determine if we should show watermark for free users
  const showWatermark = tenantStatus !== 'premium';

  // Function to handle WhatsApp screenshot sharing
  const handleSendWAScreenshot = async () => {
    // Prepare to send WhatsApp screenshot
    // Ambil screenshot hanya area struk (bukan seluruh modal)
    const node = document.querySelector('.struk-area') as HTMLElement;
    if (!node) {
      toast({ title: "Gagal", description: "Struk tidak ditemukan untuk di-screenshot." });
      return;
    }
    try {
      // Set background to white to ensure proper screenshot
      const originalBackground = node.style.backgroundColor;
      node.style.backgroundColor = '#ffffff';
      
      // Use dom-to-image-more for better compatibility
      const domtoimage: typeof import('dom-to-image-more') = await import('dom-to-image-more');
      
      // Use higher quality settings
      const dataUrl = await domtoimage.toPng(node, {
        quality: 1.0,
        bgcolor: '#ffffff',
        style: {
          'border': 'none',
          'box-shadow': 'none'
        }
      });
      
      // Restore original background
      node.style.backgroundColor = originalBackground;
      
      // Share via WhatsApp if plugin is available
      if (typeof window !== 'undefined' && window.plugins && window.plugins.socialsharing) {
        const phone = formatPhoneToWa(businessProfile?.phone || '');
        window.plugins.socialsharing.shareViaWhatsApp(
          'Berikut struk laundry Anda',
          dataUrl,
          phone || undefined,
          () => {
            toast({ title: "Berhasil", description: "Struk berhasil dibagikan via WhatsApp" });
            if (onShare) onShare();
          },
          (err: any) => { 
            toast({ title: "Gagal share WA", description: err?.message || String(err) }); 
          }
        );
      } else {
        // For browser testing - create a download link
        const link = document.createElement('a');
        link.download = `struk-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
        
        toast({ title: "Info", description: "Plugin SocialSharing tidak ditemukan. Struk diunduh sebagai gambar." });
        if (onShare) onShare();
      }
    } catch (err: any) {
      toast({ title: "Gagal screenshot", description: err?.message || String(err) });
    }
  };

  return (
    <div className="receipt-preview-container">
      <ScrollArea className="h-[80vh] w-full p-4">
        <div 
          className="receipt-content" 
          id="struk-preview"
          style={{ 
            width: width === '80mm' ? '300px' : '220px', 
            margin: '0 auto',
            padding: '0',
            position: 'relative',
            backgroundColor: 'transparent'
          }}
        >
          <div 
            className="struk-area" 
            style={{ 
              width: '100%', 
              padding: '10px',
              border: '1px dashed #ccc',
              backgroundColor: '#fff',
              boxSizing: 'border-box'
            }}
          >
            {/* Watermark for free users */}
            {showWatermark && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontSize: '20px',
                opacity: 0.15,
                color: '#000',
                fontWeight: 'bold',
                pointerEvents: 'none',
                zIndex: 10,
                width: '100%',
                textAlign: 'center'
              }}>
                LaundryPro App
              </div>
            )}

        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          {/* Logo for premium users, text for free users */}
          {tenantStatus === 'premium' && receiptSettings.show_logo && businessProfile.logo ? (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <img 
                src={businessProfile.logo} 
                alt="Business Logo" 
                style={{ maxWidth: '100px', marginBottom: '5px', display: 'block', margin: '0 auto' }} 
              />
            </div>
          ) : tenantStatus !== 'premium' && (
            <h2 style={{ margin: '5px 0', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
              LAUNDRYPRO
            </h2>
          )}
          
          {/* Business Name - only show for premium users to avoid duplication */}
          {tenantStatus === 'premium' && (
            <h2 style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>
              {businessProfile?.businessName || businessProfile?.name || 'LAUNDRYPRO'}
            </h2>
          )}
          
          {/* Header text if available - only for premium users */}
          {tenantStatus === 'premium' && receiptSettings.header_text && (
            <p style={{ margin: '5px 0', fontSize: '12px', fontStyle: 'italic' }}>
              {receiptSettings.header_text}
            </p>
          )}
          
          {/* Business name */}
          {receiptSettings.show_business_name && (
            <h3 style={{ margin: '5px 0', fontSize: '16px', fontWeight: 'bold' }}>
              {businessProfile?.businessName || businessProfile?.name || 'LAUNDRYPRO'}
            </h3>
          )}
          
          {/* Business address */}
          {receiptSettings.show_address && businessProfile.address && (
            <p style={{ margin: '2px 0', fontSize: '12px' }}>
              {businessProfile.address}
            </p>
          )}
          
          {/* Business phone */}
          {receiptSettings.show_phone && businessProfile.phone && (
            <p style={{ margin: '2px 0', fontSize: '12px' }}>
              Telp: {businessProfile.phone}
            </p>
          )}
        </div>

        <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '5px 0', marginBottom: '10px' }}>
          <p style={{ margin: '2px 0', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>No Order:</span> {order.shortId || order.id}
          </p>
          <p style={{ margin: '2px 0', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Tanggal:</span> {order.date}
          </p>
          
          {receiptSettings.show_cashier_name && (
            <p style={{ margin: '2px 0', fontSize: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>Kasir:</span> {order.cashierName || tenant?.businessName || '-'}
            </p>
          )}
          
          {receiptSettings.show_customer_info && (
            <>
              <p style={{ margin: '2px 0', fontSize: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>Nama:</span> {order.customerName}
              </p>
              {order.customerPhone && (
                <p style={{ margin: '2px 0', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold' }}>No HP:</span> {order.customerPhone}
                </p>
              )}
              {order.customerAddress && (
                <p style={{ margin: '2px 0', fontSize: '12px' }}>
                  <span style={{ fontWeight: 'bold' }}>Alamat:</span> {order.customerAddress}
                </p>
              )}
            </>
          )}
          
          {/* Delivery type information */}
          {order.deliveryType && (
            <p style={{ margin: '2px 0', fontSize: '12px' }}>
              <span style={{ fontWeight: 'bold' }}>Jemput/Antar:</span> {order.deliveryType}
            </p>
          )}
          
          {/* Priority status - pastikan konsisten dengan usePrintStruk.ts */}
          <p style={{ margin: '2px 0', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Prioritas:</span> {
              (() => {
                // Tambahkan debug inline
                const isPriority = order.isPriority === true || order.isPriority === 'true' || order.isPriority === 1;
                return isPriority ? 'Ya' : 'Tidak';
              })()
            }
          </p>
          
          {/* Estimated completion date - menggunakan formattedEstimation */}
          <p style={{ margin: '2px 0', fontSize: '12px' }}>
            <span style={{ fontWeight: 'bold' }}>Estimasi Selesai:</span> {formattedEstimation}
          </p>
        </div>

        <div style={{ marginBottom: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '2px', fontWeight: 'bold' }}>Item</th>
                <th style={{ textAlign: 'right', padding: '2px', fontWeight: 'bold' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '2px', fontWeight: 'bold' }}>Harga</th>
                <th style={{ textAlign: 'right', padding: '2px', fontWeight: 'bold' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td style={{ textAlign: 'left', padding: '2px' }}>{item.name}</td>
                  <td style={{ textAlign: 'right', padding: '2px' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '2px' }}>{formatCurrency(item.price)}</td>
                  <td style={{ textAlign: 'right', padding: '2px' }}>{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: '1px dashed #ccc', padding: '5px 0', fontSize: '12px' }}>
          {order.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Diskon:</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '5px 0', fontWeight: 'bold' }}>
            <span>Total:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
            <span>Metode Pembayaran:</span>
            <span>{order.paymentMethod}</span>
          </div>
          
          {order.amountReceived !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Dibayar:</span>
              <span>{formatCurrency(order.amountReceived)}</span>
            </div>
          )}
          
          {order.change !== undefined && (
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
              <span>Kembalian:</span>
              <span>{formatCurrency(order.change)}</span>
            </div>
          )}
        </div>

        {/* Status History if available */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div style={{ marginTop: '10px', borderTop: '1px dashed #ccc', padding: '5px 0' }}>
            <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold' }}>Riwayat Status:</p>
            {order.statusHistory.map((history, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', margin: '2px 0' }}>
                <span>{history.status}</span>
                <span>{history.timestamp}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '12px' }}>
          {/* Only print custom thank you message if it's different from footer text */}
          {receiptSettings.custom_thank_you_message && 
           receiptSettings.custom_thank_you_message !== receiptSettings.footer_text && (
            <p style={{ margin: '5px 0', fontStyle: 'italic' }}>
              {receiptSettings.custom_thank_you_message}
            </p>
          )}
          
          {/* Footer text */}
          {receiptSettings.footer_text && (
            <p style={{ margin: '5px 0', fontStyle: 'italic' }}>
              {receiptSettings.footer_text}
            </p>
          )}
          
          {/* QR Code for premium users */}
          {tenantStatus === 'premium' && receiptSettings.show_qr_code && (
            <div style={{ margin: '10px 0', textAlign: 'center' }}>
              {receiptSettings.qr_code_url ? (
                <img 
                  src={receiptSettings.qr_code_url} 
                  alt="QR Code" 
                  style={{ width: '100px', height: '100px', display: 'block', margin: '0 auto' }} 
                />
              ) : (
                <div style={{ 
                  width: '100px', 
                  height: '100px', 
                  border: '1px solid #ccc', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto',
                  backgroundColor: '#f5f5f5'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <rect x="7" y="7" width="3" height="3"></rect>
                    <rect x="14" y="7" width="3" height="3"></rect>
                    <rect x="7" y="14" width="3" height="3"></rect>
                    <rect x="14" y="14" width="3" height="3"></rect>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Marketing content for free users */}
        {tenantStatus !== 'premium' && (
          <div style={{ 
            marginTop: '10px', 
            borderTop: '1px dashed #ccc', 
            padding: '5px 0', 
            fontSize: '11px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>
              Dibuat dengan LaundryPro App
            </p>
            <p style={{ margin: '2px 0' }}>
              Kelola laundry dengan mudah
            </p>
            <p style={{ margin: '2px 0' }}>
              Download di Google Play Store
            </p>
          </div>
        )}
          </div>
        </div>
      </ScrollArea>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Tutup
          </Button>
        )}
        <Button onClick={handleSendWAScreenshot}>
          {shareButtonLabel}
        </Button>
      </div>
    </div>
  );
};

export default StrukPreview;
