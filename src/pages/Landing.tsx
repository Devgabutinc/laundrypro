import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Landing page error:", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h1>
          <pre className="bg-white p-4 rounded shadow-sm overflow-auto max-w-full text-sm mb-4">
            {this.state.error?.toString()}
          </pre>
          <p className="mb-4">Silakan coba muat ulang halaman atau hubungi dukungan jika masalah berlanjut.</p>
          <Link to="/">
            <button className="border border-red-500 text-red-500 hover:bg-red-50 px-4 py-2 rounded-md transition-colors">Kembali ke Beranda</button>
          </Link>
        </div>
      );
    }

    return this.props.children;
  }
}

const Landing = () => {
  console.log("Landing component rendering...");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("Landing component mounted");
    setMounted(true);
    
    // Log any global errors
    const errorHandler = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
    };
    
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (!mounted) {
    console.log("Landing component not yet mounted");
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header/Navbar */}
      <header className="container mx-auto py-4 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/images/logo.svg" 
            alt="LaundryPro Logo" 
            className="h-24 w-auto" 
            style={{height: '96px', width: 'auto'}} 
            onError={(e) => {
              // Fallback ke teks jika gambar tidak ditemukan
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              console.log("Logo failed to load, using text fallback");
              const parent = target.parentNode as HTMLElement;
              if (parent) {
                const textLogo = document.createElement('div');
                textLogo.className = 'text-2xl font-bold';
                textLogo.innerHTML = '<span class="text-blue-600">Laundry</span><span class="text-blue-400">Pro</span>';
                parent.appendChild(textLogo);
              }
            }}
          />
        </div>
        <div className="flex gap-4">
          <Link to="/auth">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors">
              Masuk
            </button>
          </Link>
          <Link to="/auth?register=true">
            <button className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-4 py-2 rounded-md transition-colors">
              Daftar
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">
            Kelola Bisnis Laundry Anda dengan Mudah
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            LaundryPro menyediakan solusi lengkap untuk manajemen bisnis laundry, membantu Anda mengoptimalkan operasional, meningkatkan efisiensi, dan mengembangkan bisnis Anda.
          </p>
          <div className="flex gap-4">
            <Link to="/auth?register=true">
              <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium transition-colors">
                Mulai Gratis
              </button>
            </Link>
            <Link to="/auth">
              <button className="border border-blue-500 text-blue-500 hover:bg-blue-50 px-6 py-3 rounded-md font-medium transition-colors">
                Pelajari Lebih Lanjut
              </button>
            </Link>
          </div>
        </div>
        <div className="md:w-1/2">
          <img 
            src="/hero-image.png" 
            alt="LaundryPro Dashboard" 
            className="rounded-lg shadow-lg w-full" 
            onError={(e) => {
              // Fallback ke placeholder jika gambar tidak ditemukan
              const target = e.target as HTMLImageElement;
              target.src = "/images/dashboard-placeholder.jpeg";
              console.log("Hero image failed to load, using placeholder");
            }}
          />
        </div>
      </section>

      {/* App Screenshot Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-blue-900 mb-4">Aplikasi LaundryPro</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Kelola bisnis laundry Anda dari mana saja dengan aplikasi LaundryPro yang tersedia di perangkat mobile dan desktop.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Screenshot 1 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-64 bg-gray-200 flex items-center justify-center">
                <img 
                  src="/images/app-screenshot-1.jpeg" 
                  alt="Screenshot Aplikasi 1" 
                  className="max-h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">Dashboard Intuitif</h3>
                <p className="text-gray-600">Pantau semua aktivitas bisnis laundry Anda dengan tampilan dashboard yang mudah dipahami.</p>
              </div>
            </div>
            
            {/* Screenshot 2 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-64 bg-gray-200 flex items-center justify-center">
                <img 
                  src="/images/app-screenshot-2.jpeg" 
                  alt="Screenshot Aplikasi 2" 
                  className="max-h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">Kelola Pesanan</h3>
                <p className="text-gray-600">Buat dan kelola pesanan dengan mudah, lacak status, dan kirim notifikasi otomatis ke pelanggan.</p>
              </div>
            </div>
            
            {/* Screenshot 3 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="h-64 bg-gray-200 flex items-center justify-center">
                <img 
                  src="/images/app-screenshot-3.jpeg" 
                  alt="Screenshot Aplikasi 3" 
                  className="max-h-full object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="font-bold text-lg mb-2">Laporan Bisnis</h3>
                <p className="text-gray-600">Akses laporan keuangan dan analitik bisnis untuk membantu Anda mengambil keputusan yang tepat.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-blue-900">Fitur Utama</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Manajemen Pesanan</h3>
              <p className="text-gray-600">Buat, lacak, dan kelola pesanan pelanggan dengan mudah dari penerimaan hingga pengiriman.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Pelacakan Keuangan</h3>
              <p className="text-gray-600">Lacak pendapatan, pengeluaran, dan hasilkan laporan keuangan yang detail.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Manajemen Pelanggan</h3>
              <p className="text-gray-600">Buat profil pelanggan, lacak preferensi, dan implementasikan program loyalitas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-blue-900">Fitur Aplikasi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border rounded-lg p-8 flex flex-col">
            <h3 className="text-xl font-semibold mb-2">Fitur Dasar</h3>
            <div className="text-xl font-bold mb-4 text-blue-500">Tersedia Untuk Semua Pengguna</div>
            <p className="text-gray-600 mb-6">Fitur-fitur utama untuk menjalankan bisnis laundry Anda.</p>
            <ul className="mb-8 flex-grow">
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Manajemen pesanan laundry
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Pencatatan status pesanan
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Cetak struk via Bluetooth
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Notifikasi via Firebase
              </li>
            </ul>
            <Link to="/auth?register=true" className="mt-auto">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
                Daftar Sekarang
              </button>
            </Link>
          </div>
          <div className="border rounded-lg p-8 flex flex-col bg-blue-50 border-blue-200 relative">
            <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
              PREMIUM
            </div>
            <h3 className="text-xl font-semibold mb-2">Fitur Premium</h3>
            <div className="text-xl font-bold mb-4 text-blue-500">Gratis Selama Masa Pengembangan</div>
            <p className="text-gray-600 mb-6">Fitur-fitur lanjutan untuk mengoptimalkan bisnis Anda.</p>
            <ul className="mb-8 flex-grow">
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Semua fitur dasar
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Laporan keuangan detail
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Manajemen pelanggan
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Ekspor data (PDF & Excel)
              </li>
              <li className="flex items-center mb-2">
                <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Dukungan teknis prioritas
              </li>
            </ul>
            <Link to="/auth?register=true" className="mt-auto">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md transition-colors">
                Coba Gratis Sekarang
              </button>
            </Link>
          </div>
        </div>
        <div className="text-center mt-8 text-gray-600">
          <p>Selama masa pengembangan, semua pengguna akan mendapatkan akses ke fitur premium secara gratis.</p>
          <p className="mt-2">Informasi harga akan diumumkan setelah aplikasi selesai dikembangkan.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">LaundryPro</h3>
              <p className="text-blue-200">Solusi lengkap untuk manajemen bisnis laundry.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produk</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-200 hover:text-white">Fitur</a></li>
                <li><a href="#" className="text-blue-200 hover:text-white">Harga</a></li>
                <li><a href="#" className="text-blue-200 hover:text-white">Testimoni</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-blue-200 hover:text-white">Tentang Kami</a></li>
                <li><Link to="/privacy-policy" className="text-blue-200 hover:text-white">Kebijakan Privasi</Link></li>
                <li><Link to="/terms-conditions" className="text-blue-200 hover:text-white">Syarat & Ketentuan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <ul className="space-y-2">
                <li className="text-blue-200">support@laundrypro.com</li>
                <li className="text-blue-200">+62 812 3456 7890</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-800 mt-8 pt-8 text-center text-blue-200">
            <p>© {new Date().getFullYear()} LaundryPro. Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

const WrappedLanding = () => {
  return (
    <ErrorBoundary>
      <Landing />
    </ErrorBoundary>
  );
};

export default WrappedLanding;
