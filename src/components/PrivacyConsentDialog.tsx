import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function PrivacyConsentDialog() {
  const [showConsent, setShowConsent] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  useEffect(() => {
    // Cek apakah pengguna sudah memberikan persetujuan
    const consent = localStorage.getItem('privacy_consent');
    
    // Jika pengguna belum memberikan persetujuan atau sebelumnya menolak
    if (consent === null || consent === 'false') {
      // Tampilkan dialog persetujuan
      setShowConsent(true);
      
      // Jika user sudah login tapi belum menyetujui kebijakan privasi
      if (user) {
        // Tidak perlu menampilkan alert di sini karena dialog persetujuan akan muncul
        // Dialog persetujuan sudah cukup untuk menjelaskan situasi
      }
    }
  }, [user]);
  
  // Efek terpisah untuk memastikan pengguna tidak bisa menggunakan aplikasi tanpa persetujuan
  useEffect(() => {
    // Cek persetujuan setiap kali user berubah (login/logout)
    if (user) {
      const consent = localStorage.getItem('privacy_consent');
      if (consent !== 'true') {
        setShowConsent(true);
      }
    }
  }, [user]);
  
  const handleConsent = (agreed: boolean) => {
    // Simpan persetujuan di localStorage
    localStorage.setItem('privacy_consent', String(agreed));
    
    // Jika di masa depan ingin menyimpan di Supabase, bisa tambahkan kode di sini
    // setelah membuat tabel user_consents di database
    
    if (agreed) {
      // Jika setuju, sembunyikan dialog dan lanjutkan penggunaan aplikasi
      setShowConsent(false);
    } else {
      // Jika tidak setuju, tampilkan pesan dan arahkan ke halaman login
      alert('Untuk menggunakan aplikasi LaundryPro, Anda perlu menyetujui Kebijakan Privasi kami. Aplikasi tidak dapat digunakan tanpa persetujuan ini.');
      // Logout jika user sudah login
      if (user) {
        logout();
      }
      // Arahkan ke halaman login
      navigate('/auth');
    }
  };
  
  if (!showConsent) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Persetujuan Privasi Data</h2>
        
        <p className="mb-4 text-gray-700">
          LaundryPro mengumpulkan dan memproses data Anda untuk menyediakan layanan pengelolaan laundry yang optimal. 
          Data yang kami kumpulkan meliputi:
        </p>
        
        <ul className="list-disc pl-6 mb-4 text-gray-700 space-y-1">
          <li>Informasi profil dan bisnis Anda</li>
          <li>Data transaksi dan pelanggan</li>
          <li>Informasi penggunaan aplikasi</li>
          <li>Akses ke Bluetooth (untuk printer thermal)</li>
          <li>Akses ke penyimpanan (untuk ekspor data)</li>
        </ul>
        
        <p className="mb-4 text-gray-700">
          Dengan menggunakan aplikasi ini, Anda menyetujui pengumpulan dan pemrosesan data sesuai dengan 
          <Button 
            variant="link" 
            className="px-1 text-blue-600 font-medium"
            onClick={() => {
              navigate('/privacy-policy');
              setShowConsent(false);
            }}
          >
            Kebijakan Privasi
          </Button> 
          dan 
          <Button 
            variant="link" 
            className="px-1 text-blue-600 font-medium"
            onClick={() => {
              navigate('/terms-conditions');
              setShowConsent(false);
            }}
          >
            Syarat & Ketentuan
          </Button> 
          kami.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => handleConsent(false)}
            className="order-1 sm:order-none"
          >
            Tidak Setuju
          </Button>
          <Button 
            onClick={() => handleConsent(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Saya Setuju
          </Button>
        </div>
      </div>
    </div>
  );
}
