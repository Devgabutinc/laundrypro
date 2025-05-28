import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header/Navbar */}
      <header className="container mx-auto py-6 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/assets/logo.png" 
            alt="LaundryPro Logo" 
            className="h-10 w-auto mr-2"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/150x50?text=LaundryPro';
            }}
          />
          <span className="text-2xl font-bold text-blue-600">LaundryPro</span>
        </div>
        <nav className="hidden md:flex space-x-6">
          <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors">Fitur</a>
          <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Harga</a>
          <a href="#testimonials" className="text-gray-600 hover:text-blue-600 transition-colors">Testimoni</a>
          <a href="#contact" className="text-gray-600 hover:text-blue-600 transition-colors">Kontak</a>
        </nav>
        <div className="flex space-x-3">
          <Link to="/">
            <Button variant="outline" className="hidden sm:inline-flex">Aplikasi</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" className="hidden sm:inline-flex">Masuk</Button>
          </Link>
          <Link to="/auth?tab=register">
            <Button>Daftar</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center">
        <motion.div 
          className="md:w-1/2 mb-10 md:mb-0"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4">
            Kelola Bisnis Laundry Anda dengan Mudah
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Solusi lengkap untuk manajemen laundry, dari penerimaan order hingga pengiriman. Tingkatkan efisiensi dan kepuasan pelanggan Anda.
          </p>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <Link to="/auth?tab=register">
              <Button size="lg" className="w-full sm:w-auto">
                Mulai Gratis
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Pelajari Lebih Lanjut
              </Button>
            </a>
          </div>
        </motion.div>
        <motion.div 
          className="md:w-1/2"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <img 
            src="https://via.placeholder.com/600x400?text=LaundryPro+Dashboard" 
            alt="LaundryPro Dashboard" 
            className="rounded-lg shadow-2xl"
          />
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Fitur Unggulan</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              LaundryPro menyediakan semua fitur yang Anda butuhkan untuk mengelola bisnis laundry dengan efisien.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Point of Sale",
                description: "Sistem kasir yang mudah digunakan untuk mencatat pesanan dengan cepat dan akurat.",
                icon: "💰"
              },
              {
                title: "Pelacakan Order",
                description: "Pantau status pesanan secara real-time dan kirimkan update kepada pelanggan.",
                icon: "📦"
              },
              {
                title: "Manajemen Pelanggan",
                description: "Kelola data pelanggan dan riwayat pesanan untuk meningkatkan layanan.",
                icon: "👥"
              },
              {
                title: "Manajemen Inventaris",
                description: "Kelola stok bahan dan produk laundry dengan mudah.",
                icon: "📊"
              },
              {
                title: "Laporan Keuangan",
                description: "Dapatkan laporan keuangan yang detail untuk memantau performa bisnis.",
                icon: "📈"
              },
              {
                title: "Dukungan Offline",
                description: "Tetap beroperasi meskipun koneksi internet terputus.",
                icon: "🔄"
              }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-blue-50 rounded-lg p-8 shadow-sm hover:shadow-md transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Paket Harga</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Pilih paket yang sesuai dengan kebutuhan bisnis laundry Anda.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Basic",
                price: "Gratis",
                description: "Untuk bisnis laundry yang baru memulai",
                features: [
                  "Point of Sale",
                  "Pelacakan Order",
                  "Manajemen Pelanggan",
                  "Maksimal 50 order per bulan",
                  "1 Pengguna"
                ],
                highlighted: false
              },
              {
                name: "Premium",
                price: "Rp 299.000",
                period: "/bulan",
                description: "Untuk bisnis laundry yang berkembang",
                features: [
                  "Semua fitur Basic",
                  "Manajemen Inventaris",
                  "Laporan Keuangan",
                  "Order tidak terbatas",
                  "3 Pengguna",
                  "Dukungan prioritas"
                ],
                highlighted: true
              },
              {
                name: "Enterprise",
                price: "Rp 599.000",
                period: "/bulan",
                description: "Untuk jaringan laundry dengan banyak cabang",
                features: [
                  "Semua fitur Premium",
                  "Manajemen multi-cabang",
                  "API akses",
                  "Pengguna tidak terbatas",
                  "Dukungan 24/7",
                  "Pelatihan khusus"
                ],
                highlighted: false
              }
            ].map((plan, index) => (
              <motion.div 
                key={index}
                className={`rounded-lg p-8 ${plan.highlighted ? 'bg-blue-600 text-white shadow-xl scale-105' : 'bg-white text-gray-900 shadow-md'}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-end mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className={`ml-1 ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>{plan.period}</span>}
                </div>
                <p className={`mb-6 ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>{plan.description}</p>
                <ul className="mb-8 space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <svg className={`w-5 h-5 mr-2 ${plan.highlighted ? 'text-blue-100' : 'text-blue-500'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?tab=register">
                  <Button 
                    className={`w-full ${plan.highlighted ? 'bg-white text-blue-600 hover:bg-gray-100' : ''}`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    {plan.highlighted ? 'Mulai Sekarang' : 'Daftar'}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Apa Kata Mereka</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Dengarkan pengalaman dari pemilik bisnis laundry yang telah menggunakan LaundryPro.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Budi Santoso",
                role: "Pemilik, Budi Laundry",
                content: "LaundryPro telah membantu saya menghemat waktu dan mengurangi kesalahan dalam pencatatan order. Pelanggan saya juga senang karena bisa melacak status cucian mereka.",
                image: "https://randomuser.me/api/portraits/men/1.jpg"
              },
              {
                name: "Siti Rahayu",
                role: "Manager, Clean Express",
                content: "Sejak menggunakan LaundryPro, pendapatan kami meningkat 30% karena kami bisa melayani lebih banyak pelanggan dengan efisien. Laporan keuangan juga sangat membantu untuk evaluasi bisnis.",
                image: "https://randomuser.me/api/portraits/women/1.jpg"
              },
              {
                name: "Deni Wijaya",
                role: "Pemilik, Fresh Laundry",
                content: "Fitur manajemen inventaris sangat membantu kami mengontrol penggunaan bahan. LaundryPro juga mudah digunakan oleh karyawan baru tanpa pelatihan yang lama.",
                image: "https://randomuser.me/api/portraits/men/2.jpg"
              }
            ].map((testimonial, index) => (
              <motion.div 
                key={index}
                className="bg-gray-50 rounded-lg p-8 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="flex items-center mb-6">
                  <img 
                    src={testimonial.image} 
                    alt={testimonial.name} 
                    className="w-14 h-14 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.content}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-16 md:py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap Meningkatkan Bisnis Laundry Anda?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
            Bergabunglah dengan ribuan pemilik bisnis laundry yang telah menggunakan LaundryPro untuk meningkatkan efisiensi dan kepuasan pelanggan.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link to="/auth?tab=register">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 w-full sm:w-auto">
                Daftar Sekarang
              </Button>
            </Link>
            <a href="#contact">
              <Button size="lg" variant="outline" className="border-white hover:bg-blue-700 w-full sm:w-auto">
                Hubungi Kami
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Hubungi Kami</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Punya pertanyaan? Tim kami siap membantu Anda.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">Kirim Pesan</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nama Anda"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email@anda.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subjek</label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Subjek pesan"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                  <textarea
                    id="message"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tulis pesan Anda di sini..."
                  ></textarea>
                </div>
                <Button type="submit" className="w-full sm:w-auto">Kirim Pesan</Button>
              </form>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-semibold mb-6 text-gray-900">Informasi Kontak</h3>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Telepon</h4>
                    <p className="text-gray-600">+62 812 3456 7890</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Email</h4>
                    <p className="text-gray-600">info@laundrypro.com</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-blue-100 p-3 rounded-full mr-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-1">Alamat</h4>
                    <p className="text-gray-600">Jl. Teknologi No. 123, Jakarta Selatan, Indonesia</p>
                  </div>
                </div>
                
                <div className="pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Ikuti Kami</h4>
                  <div className="flex space-x-4">
                    {['facebook', 'twitter', 'instagram', 'linkedin'].map((social, index) => (
                      <a 
                        key={index}
                        href={`#${social}`} 
                        className="bg-blue-100 p-3 rounded-full text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z" />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img 
                  src="https://via.placeholder.com/120x40?text=LaundryPro" 
                  alt="LaundryPro Logo" 
                  className="h-8 w-auto mr-2"
                />
                <span className="text-xl font-bold">LaundryPro</span>
              </div>
              <p className="text-gray-400 mb-4">
                Solusi manajemen laundry terbaik untuk bisnis Anda.
              </p>
              <p className="text-gray-400">
                © {new Date().getFullYear()} LaundryPro. All rights reserved.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Produk</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Fitur</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Harga</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Demo</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Tentang Kami</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Karir</a></li>
                <li><a href="#contact" className="text-gray-400 hover:text-white transition-colors">Kontak</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link to="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
                <li><Link to="/terms-conditions" className="text-gray-400 hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Kebijakan Cookie</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Keamanan</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
