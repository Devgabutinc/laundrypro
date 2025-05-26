import React, { forwardRef, useState, useEffect } from "react";
import { TenantContext } from "@/contexts/TenantContext";
import html2canvas from 'html2canvas';
// Import plugin Capacitor
import { LidtaCapacitorBlPrinter } from 'lidta-capacitor-bl-printer';

interface PrintStrukThermalProps {
  businessProfile: any;
  order: {
    customerName: string;
    items: { name: string; quantity: number; price: number }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    amountReceived?: number;
    change?: number;
    date: string;
  };
  tenantStatus: string; // 'free' | 'premium' | 'suspended'
  isStrukClean?: boolean;
  onPrint?: () => void;
  width?: '58mm' | '80mm';
  isModalOpen?: boolean; // Prop ini bisa digunakan untuk memicu pemuatan daftar printer saat modal terbuka
}

export const PrintStrukThermal = forwardRef<HTMLDivElement, PrintStrukThermalProps>(({ width = '58mm', isModalOpen }, ref) => {
  // Component rendered with modal state
  // Hapus semua logika dan UI lain sementara waktu
  return (
    <div ref={ref} style={{ width: width === '80mm' ? 280 : 210, border: '1px dashed gray', padding: 16, textAlign: 'center' }}>
      <p>Komponen PrintStrukThermal Dirender!</p>
      <p>Lebar: {width}</p>
      {/* Biarkan bagian printer selection untuk test UI */}
      <div className="text-center mt-4">
        {/* UI untuk memilih printer - biarkan ini ada */}
        <div>Pilihan Printer Akan Muncul Di Sini</div>
        {/* Tombol cetak sementara disembunyikan atau dinonaktifkan */}
        <button disabled={true} style={{ marginTop: 8 }}>Cetak (Disabled)</button>
      </div>
    </div>
  );
});

export default PrintStrukThermal; 