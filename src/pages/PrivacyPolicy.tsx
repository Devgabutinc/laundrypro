import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button
        variant="outline"
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        Kembali
      </Button>

      <h1 className="text-2xl font-bold mb-6 text-center">Kebijakan Privasi LaundryPro</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Pendahuluan</h2>
          <p className="text-gray-700">
            Selamat datang di LaundryPro. Kami menghargai privasi Anda dan berkomitmen untuk melindungi informasi pribadi yang Anda bagikan dengan kami. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda saat Anda menggunakan aplikasi LaundryPro.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Informasi yang Kami Kumpulkan</h2>
          <p className="text-gray-700 mb-2">
            Kami mengumpulkan informasi berikut untuk menyediakan dan meningkatkan layanan kami:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><strong>Informasi Akun:</strong> Nama, alamat email, nomor telepon, dan kredensial login.</li>
            <li><strong>Informasi Bisnis:</strong> Nama bisnis, alamat, jenis usaha, dan detail kontak.</li>
            <li><strong>Data Transaksi:</strong> Informasi tentang pesanan, pembayaran, dan layanan yang digunakan.</li>
            <li><strong>Data Pelanggan:</strong> Informasi tentang pelanggan Anda yang Anda masukkan ke dalam sistem.</li>
            <li><strong>Data Penggunaan:</strong> Informasi tentang bagaimana Anda menggunakan aplikasi, fitur yang diakses, dan preferensi.</li>
            <li><strong>Informasi Perangkat:</strong> Jenis perangkat, sistem operasi, dan pengidentifikasi perangkat.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Bagaimana Kami Menggunakan Informasi Anda</h2>
          <p className="text-gray-700 mb-2">
            Kami menggunakan informasi yang dikumpulkan untuk:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Menyediakan, memelihara, dan meningkatkan layanan kami.</li>
            <li>Memproses transaksi dan mengelola akun Anda.</li>
            <li>Mengirim pemberitahuan terkait layanan, pembaruan, dan pesan promosi.</li>
            <li>Merespons pertanyaan dan memberikan dukungan pelanggan.</li>
            <li>Menganalisis penggunaan aplikasi untuk meningkatkan pengalaman pengguna.</li>
            <li>Mendeteksi, mencegah, dan mengatasi masalah teknis atau keamanan.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Berbagi Informasi</h2>
          <p className="text-gray-700 mb-2">
            Kami tidak menjual atau menyewakan data pribadi Anda kepada pihak ketiga. Namun, kami dapat membagikan informasi dalam situasi berikut:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><strong>Penyedia Layanan:</strong> Kami bekerja sama dengan pihak ketiga tepercaya yang membantu kami mengoperasikan aplikasi dan bisnis kami (seperti layanan hosting, pemrosesan pembayaran, dan analitik).</li>
            <li><strong>Kepatuhan Hukum:</strong> Jika diwajibkan oleh hukum atau dalam menanggapi proses hukum yang sah.</li>
            <li><strong>Perlindungan:</strong> Untuk melindungi hak, properti, atau keselamatan kami, pengguna kami, atau publik.</li>
            <li><strong>Persetujuan:</strong> Dengan persetujuan atau arahan Anda.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Keamanan Data</h2>
          <p className="text-gray-700">
            Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang dirancang untuk melindungi informasi pribadi Anda dari akses, penggunaan, atau pengungkapan yang tidak sah. Namun, tidak ada metode transmisi internet atau penyimpanan elektronik yang 100% aman, dan kami tidak dapat menjamin keamanan absolut.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Hak Privasi Anda</h2>
          <p className="text-gray-700 mb-2">
            Anda memiliki hak tertentu terkait dengan data pribadi Anda, termasuk:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Mengakses dan menerima salinan data pribadi Anda.</li>
            <li>Memperbaiki data yang tidak akurat atau tidak lengkap.</li>
            <li>Meminta penghapusan data pribadi Anda dalam keadaan tertentu.</li>
            <li>Membatasi atau menolak pemrosesan data Anda.</li>
            <li>Menarik persetujuan Anda kapan saja untuk pemrosesan berdasarkan persetujuan.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Informasi tentang Pihak Ketiga (SDK/API)</h2>
          <p className="text-gray-700 mb-2">
            Aplikasi LaundryPro menggunakan beberapa layanan dan pustaka pihak ketiga untuk meningkatkan fungsionalitas aplikasi. Berikut adalah daftar pihak ketiga yang kami gunakan:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><strong>Supabase:</strong> Digunakan untuk autentikasi, penyimpanan data, dan manajemen database. Informasi lebih lanjut tentang kebijakan privasi Supabase dapat ditemukan di <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://supabase.com/privacy</a>.</li>
            
            <li><strong>Firebase Cloud Messaging (FCM):</strong> Kami menggunakan Firebase Cloud Messaging untuk mengirimkan notifikasi. Token perangkat Anda dikumpulkan untuk keperluan pengiriman pesan yang bersifat fungsional dan informatif. Informasi lebih lanjut tentang kebijakan privasi Firebase dapat ditemukan di <a href="https://firebase.google.com/support/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://firebase.google.com/support/privacy</a>.</li>
            
            <li><strong>Capacitor:</strong> Framework yang digunakan untuk mengembangkan aplikasi mobile dari kode web. Ini memungkinkan akses ke fitur perangkat seperti kamera, penyimpanan file, dan notifikasi.</li>
            
            <li><strong>Bluetooth Serial dan Izin Lokasi:</strong> Plugin yang digunakan untuk koneksi dengan printer Bluetooth untuk mencetak struk. Perlu diketahui bahwa pada perangkat Android 10 dan yang lebih baru, akses lokasi (ACCESS_FINE_LOCATION dan ACCESS_COARSE_LOCATION) diperlukan untuk melakukan pemindaian perangkat Bluetooth. Ini adalah persyaratan sistem Android dan bukan karena aplikasi kami menggunakan data lokasi Anda. Pada Android 12 dan yang lebih baru, kami menggunakan izin BLUETOOTH_SCAN dengan flag neverForLocation untuk menjelaskan bahwa pemindaian Bluetooth tidak digunakan untuk pelacakan lokasi.</li>
            
            <li><strong>Social Sharing:</strong> Plugin yang digunakan untuk berbagi konten seperti struk atau laporan melalui aplikasi lain di perangkat Anda. Ketika Anda menggunakan fitur ini, data yang dibagikan akan diproses oleh aplikasi penerima yang Anda pilih.</li>
            
            <li><strong>Filesystem:</strong> Digunakan untuk mengakses sistem file perangkat untuk menyimpan dan membaca file seperti laporan dan ekspor data. Akses ini terbatas pada direktori aplikasi dan direktori yang Anda pilih saat mengekspor data.</li>
            
            <li><strong>PDF Generation (jsPDF):</strong> Digunakan untuk membuat dokumen PDF seperti laporan dan struk. Pemrosesan dilakukan secara lokal di perangkat Anda dan tidak mengirimkan data ke server eksternal.</li>
            
            <li><strong>Excel Export (xlsx):</strong> Digunakan untuk mengekspor data dalam format Excel. Seperti pembuatan PDF, pemrosesan dilakukan secara lokal di perangkat Anda.</li>
          </ul>
          <p className="text-gray-700 mt-2">
            Semua layanan pihak ketiga ini dipilih dengan mempertimbangkan keamanan dan privasi data Anda. Namun, kami menyarankan Anda untuk membaca kebijakan privasi masing-masing layanan untuk informasi lebih lanjut tentang bagaimana mereka menangani data Anda.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Perubahan Kebijakan Privasi</h2>
          <p className="text-gray-700">
            Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke waktu untuk mencerminkan perubahan praktik kami atau karena alasan lain. Kami akan memberi tahu Anda tentang perubahan signifikan dengan memposting kebijakan baru di aplikasi atau melalui pemberitahuan langsung.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Hubungi Kami</h2>
          <p className="text-gray-700">
            Jika Anda memiliki pertanyaan atau kekhawatiran tentang Kebijakan Privasi ini atau praktik data kami, silakan hubungi kami di:
          </p>
          <p className="text-gray-700 font-medium mt-2">
            Email: support@laundrypro.id<br />
            WhatsApp: +62 812-3456-7890
          </p>
        </section>

        <div className="text-gray-500 text-sm mt-6">
          Terakhir diperbarui: 28 Mei 2025
        </div>
      </div>
    </div>
  );
}
