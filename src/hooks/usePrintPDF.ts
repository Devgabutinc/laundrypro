import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Capacitor } from '@capacitor/core';
import { exportFileWithSAF, getMimeType } from '@/utils/fileExportUtils';

// Format currency helper
const formatCurrency = (amount: number): string => {
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp' + formatted;
};

interface PrintPDFOptions {
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
  businessName?: string;
  address?: string;
  phone?: string;
  logo?: string;
  status?: string; // 'free' | 'premium' | 'suspended'
}

export const usePrintPDF = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Generate PDF receipt
  const generatePDF = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string
  ): Promise<string> => {
    try {
      // Dynamically import jsPDF to reduce bundle size
      const { default: jsPDF } = await import('jspdf');
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });
      
      // Set default font
      doc.setFont('helvetica', 'normal');
      
      // Variables for positioning
      const margin = 10;
      const pageWidth = doc.internal.pageSize.width;
      const centerX = pageWidth / 2;
      let yPos = margin;
      
      // Helper function for centered text
      const addCenteredText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
        doc.text(text, centerX - (textWidth / 2), y);
        return y + (fontSize / 5);
      };
      
      // Helper function for left-aligned text
      const addText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.text(text, margin, y);
        return y + (fontSize / 5);
      };
      
      // Helper function for right-aligned text
      const addRightText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const textWidth = doc.getStringUnitWidth(text) * fontSize / doc.internal.scaleFactor;
        doc.text(text, pageWidth - margin - textWidth, y);
        return y;
      };
      
      // Add business header
      if (tenantStatus === 'premium') {
        // Premium header with business name
        yPos = addCenteredText(businessProfile?.businessName || businessProfile?.name || 'LAUNDRYPRO', yPos + 5, 16, true);
      } else {
        // Free header with LAUNDRYPRO text
        yPos = addCenteredText('LAUNDRYPRO', yPos + 5, 16, true);
      }
      
      // Add business address and phone
      if (businessProfile?.address) {
        yPos = addCenteredText(businessProfile.address, yPos + 5, 10);
      }
      if (businessProfile?.phone) {
        yPos = addCenteredText(`Telp: ${businessProfile.phone}`, yPos + 5, 10);
      }
      
      // Add separator line
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
      yPos += 10;
      
      // Add receipt title
      yPos = addCenteredText('STRUK PEMBAYARAN', yPos + 5, 14, true);
      yPos += 5;
      
      // Add order details
      yPos = addText(`No Order: ${order.shortId || order.id?.slice(-4) || '-'}`, yPos + 5, 10, true);
      yPos = addText(`Tanggal: ${order.date || '-'}`, yPos + 3, 10);
      if (order.cashierName) {
        yPos = addText(`Kasir: ${order.cashierName}`, yPos + 3, 10);
      }
      
      // Add customer details
      yPos = addText(`Nama: ${order.customerName || '-'}`, yPos + 5, 10, true);
      if (order.customerPhone) {
        yPos = addText(`No HP: ${order.customerPhone}`, yPos + 3, 10);
      }
      if (order.customerAddress) {
        yPos = addText(`Alamat: ${order.customerAddress}`, yPos + 3, 10);
      }
      
      // Add delivery type if available
      if (order.deliveryType) {
        yPos = addText(`Jemput/Antar: ${order.deliveryType}`, yPos + 3, 10);
      }
      
      // Add priority status
      yPos = addText(`Prioritas: ${order.isPriority ? 'Ya' : 'Tidak'}`, yPos + 3, 10);
      
      // Add estimated completion
      if (order.estimatedCompletion) {
        yPos = addText(`Estimasi Selesai: ${order.estimatedCompletion}`, yPos + 3, 10);
      }
      
      // Add separator line
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 5, pageWidth - margin, yPos + 5);
      yPos += 10;
      
      // Create a table with clear column definitions
      const colWidth = (pageWidth - (margin * 2)) / 10; // Divide available width into 10 units
      const col1 = margin;                  // Item (5 units)
      const col2 = margin + (colWidth * 5); // Qty (1 unit)
      const col3 = margin + (colWidth * 6); // Harga (2 units)
      const col4 = margin + (colWidth * 8); // Total (2 units)
      
      // Add items table header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Item', col1, yPos);
      doc.text('Qty', col2, yPos);
      doc.text('Harga', col3, yPos);
      doc.text('Total', col4, yPos);
      yPos += 5;
      
      // Add separator line
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      
      // Add items
      doc.setFont('helvetica', 'normal');
      for (const item of order.items) {
        // Calculate item name max width to avoid overlap
        const maxItemWidth = col2 - col1 - 2; // 2mm buffer
        const itemNameMaxChars = Math.floor(maxItemWidth * doc.internal.scaleFactor / (doc.getFontSize() * 0.6));
        
        // Item name - limit length to avoid overlap
        const displayName = item.name.length > itemNameMaxChars ? 
          item.name.substring(0, itemNameMaxChars - 3) + '...' : 
          item.name;
        doc.text(displayName, col1, yPos);
        
        // Quantity
        doc.text(item.quantity.toString(), col2, yPos);
        
        // Price
        doc.text(formatCurrency(item.price), col3, yPos);
        
        // Total
        const itemTotal = formatCurrency(item.price * item.quantity);
        doc.text(itemTotal, col4, yPos);
        
        yPos += 5;
      }
      
      // Add separator line
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 7;
      
      // Add totals
      if (order.discount > 0) {
        doc.text('Diskon:', pageWidth - 40, yPos);
        doc.text(`-${formatCurrency(order.discount)}`, pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 5;
      }
      
      // Add total with bold font
      doc.setFont('helvetica', 'bold');
      doc.text('Total:', pageWidth - 40, yPos);
      doc.text(formatCurrency(order.total), pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 7;
      
      // Add payment details
      doc.setFont('helvetica', 'normal');
      doc.text('Metode Pembayaran:', margin, yPos);
      doc.text(order.paymentMethod, pageWidth - margin - 5, yPos, { align: 'right' });
      yPos += 5;
      
      if (order.paymentStatus) {
        doc.text('Status Pembayaran:', margin, yPos);
        doc.text(order.paymentStatus, pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 5;
      }
      
      if (order.amountReceived !== undefined) {
        doc.text('Dibayar:', margin, yPos);
        doc.text(formatCurrency(order.amountReceived), pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 5;
      }
      
      if (order.change !== undefined) {
        doc.text('Kembalian:', margin, yPos);
        doc.text(formatCurrency(order.change), pageWidth - margin - 5, yPos, { align: 'right' });
        yPos += 5;
      }
      
      // Add status history if available
      if (order.statusHistory && order.statusHistory.length > 0) {
        yPos += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Riwayat Status:', margin, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        for (const history of order.statusHistory) {
          doc.text(`${history.status}: ${history.timestamp}`, margin + 5, yPos);
          yPos += 5;
        }
      }
      
      // Add thank you message
      yPos += 10;
      yPos = addCenteredText('Terima kasih telah menggunakan jasa kami!', yPos, 10);
      
      // Add marketing content for free users
      if (tenantStatus !== 'premium') {
        yPos += 10;
        yPos = addCenteredText('Dibuat dengan LaundryPro App', yPos, 10, true);
        yPos = addCenteredText('Kelola laundry dengan mudah', yPos + 5, 10);
        yPos = addCenteredText('Download di Google Play Store', yPos + 5, 10);
      }
      
      // Convert PDF to base64 string
      const pdfBase64 = doc.output('datauristring');
      return pdfBase64.split(',')[1]; // Remove the data URI prefix
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  // Download PDF receipt
  const downloadPDF = async (
    order: OrderData,
    businessProfile: BusinessProfile,
    tenantStatus: string,
    options: PrintPDFOptions = {}
  ) => {
    const { onSuccess, onError } = options;
    setLoading(true);

    try {
      // Generate PDF
      const pdfBase64 = await generatePDF(order, businessProfile, tenantStatus);
      const fileName = `struk_${order.shortId || order.id?.slice(-4) || new Date().getTime()}.pdf`;
      
      // Check if running on a mobile device
      if (Capacitor.isNativePlatform()) {
        // Get MIME type
        const mimeType = getMimeType(fileName);
        
        // Export file using SAF
        const result = await exportFileWithSAF(fileName, pdfBase64, mimeType);
        
        if (result.success) {
          toast({ 
            title: "Berhasil", 
            description: "Struk PDF berhasil disimpan", 
            variant: "default" 
          });
          
          if (result.error) {
            toast({
              variant: "warning",
              title: "Informasi",
              description: result.error,
            });
          }
          
          if (onSuccess) onSuccess();
        } else {
          toast({ 
            title: "Gagal", 
            description: `Gagal menyimpan PDF: ${result.error}`, 
            variant: "destructive" 
          });
          
          if (onError) onError(new Error(result.error));
        }
      } else {
        // For browser, create a download link
        const linkSource = `data:application/pdf;base64,${pdfBase64}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = fileName;
        downloadLink.click();
        
        toast({ 
          title: "Berhasil", 
          description: "Struk PDF berhasil diunduh", 
          variant: "default" 
        });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({ 
        title: "Gagal", 
        description: "Terjadi kesalahan saat mengunduh PDF", 
        variant: "destructive" 
      });
      
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  };

  return {
    downloadPDF,
    loading
  };
};
