import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsConditions() {
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

      <h1 className="text-2xl font-bold mb-6 text-center">Syarat & Ketentuan LaundryPro</h1>
      
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Pendahuluan</h2>
          <p className="text-gray-700">
            Selamat datang di LaundryPro. Dengan mengakses atau menggunakan aplikasi LaundryPro, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak setuju dengan bagian apa pun dari syarat ini, Anda tidak boleh menggunakan aplikasi kami.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Definisi</h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><strong>"Aplikasi"</strong> mengacu pada aplikasi LaundryPro, termasuk semua konten, fitur, dan fungsionalitasnya.</li>
            <li><strong>"Pengguna"</strong> mengacu pada individu atau entitas yang mengakses atau menggunakan Aplikasi.</li>
            <li><strong>"Layanan"</strong> mengacu pada fitur dan fungsi yang disediakan melalui Aplikasi.</li>
            <li><strong>"Konten"</strong> mengacu pada semua informasi, data, teks, gambar, dan materi lain yang tersedia melalui Aplikasi.</li>
            <li><strong>"Akun"</strong> mengacu pada akun terdaftar yang dibuat oleh Pengguna untuk mengakses Aplikasi.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Penggunaan Layanan</h2>
          <p className="text-gray-700 mb-2">
            Dengan menggunakan Aplikasi, Anda menyatakan dan menjamin bahwa:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Anda berusia minimal 17 tahun atau memiliki persetujuan dari orang tua atau wali.</li>
            <li>Anda memiliki hak, wewenang, dan kapasitas untuk menyetujui syarat ini.</li>
            <li>Informasi yang Anda berikan akurat, lengkap, dan terkini.</li>
            <li>Anda akan menjaga keamanan kredensial akun Anda dan bertanggung jawab atas semua aktivitas yang terjadi di bawah akun Anda.</li>
            <li>Anda tidak akan menggunakan Aplikasi untuk tujuan ilegal atau tidak sah.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Paket Layanan dan Pembayaran</h2>
          <p className="text-gray-700 mb-2">
            LaundryPro menawarkan paket layanan berikut:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li><strong>Paket Gratis:</strong> Akses terbatas ke fitur dasar dengan batasan penggunaan.</li>
            <li><strong>Paket Premium:</strong> Akses penuh ke semua fitur dengan biaya berlangganan.</li>
          </ul>
          <p className="text-gray-700 mt-2 mb-2">
            Ketentuan pembayaran:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Pembayaran untuk paket premium harus dilakukan di muka.</li>
            <li>Semua pembayaran bersifat non-refundable kecuali ditentukan lain oleh hukum yang berlaku.</li>
            <li>Kami berhak mengubah harga paket dengan pemberitahuan sebelumnya.</li>
            <li>Pajak yang berlaku mungkin ditambahkan ke biaya berlangganan.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Batasan Penggunaan</h2>
          <p className="text-gray-700 mb-2">
            Anda setuju untuk tidak:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-1">
            <li>Menggunakan Aplikasi dengan cara yang melanggar hukum atau peraturan yang berlaku.</li>
            <li>Memodifikasi, mengadaptasi, atau meretas Aplikasi.</li>
            <li>Menghapus pemberitahuan hak cipta, merek dagang, atau hak kepemilikan lainnya.</li>
            <li>Menggunakan Aplikasi untuk mengirim materi yang berbahaya, ofensif, atau ilegal.</li>
            <li>Mengumpulkan atau melacak informasi pribadi pengguna lain.</li>
            <li>Mengganggu atau merusak Aplikasi atau server dan jaringan yang terhubung.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Hak Kekayaan Intelektual</h2>
          <p className="text-gray-700">
            Aplikasi dan kontennya, termasuk tetapi tidak terbatas pada teks, grafik, logo, ikon, gambar, klip audio, unduhan digital, dan kompilasi data, adalah milik LaundryPro atau pemberi lisensinya dan dilindungi oleh hukum hak cipta, merek dagang, dan hak kekayaan intelektual lainnya. Anda tidak boleh mereproduksi, mendistribusikan, memodifikasi, atau membuat karya turunan dari materi apa pun tanpa izin tertulis sebelumnya.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Penghentian</h2>
          <p className="text-gray-700">
            Kami berhak, atas kebijakan kami sendiri, untuk menangguhkan atau menghentikan akses Anda ke Aplikasi tanpa pemberitahuan sebelumnya karena alasan apa pun, termasuk tetapi tidak terbatas pada pelanggaran syarat ini. Semua ketentuan yang secara alami harus bertahan setelah penghentian akan tetap berlaku, termasuk, tanpa batasan, ketentuan kepemilikan, penafian garansi, ganti rugi, dan batasan tanggung jawab.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Penafian Garansi</h2>
          <p className="text-gray-700">
            Aplikasi disediakan "sebagaimana adanya" dan "sebagaimana tersedia" tanpa jaminan apa pun, baik tersurat maupun tersirat. LaundryPro tidak menjamin bahwa Aplikasi akan bebas dari kesalahan atau tidak terputus, atau bahwa cacat akan diperbaiki, atau bahwa Aplikasi bebas dari virus atau komponen berbahaya lainnya.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Batasan Tanggung Jawab</h2>
          <p className="text-gray-700">
            Dalam keadaan apa pun, LaundryPro atau afiliasinya tidak bertanggung jawab atas kerusakan langsung, tidak langsung, insidental, khusus, atau konsekuensial yang timbul dari atau dengan cara apa pun terkait dengan penggunaan atau ketidakmampuan menggunakan Aplikasi, termasuk tetapi tidak terbatas pada kerusakan untuk kehilangan keuntungan, goodwill, penggunaan, data, atau kerugian tidak berwujud lainnya.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Perubahan Syarat</h2>
          <p className="text-gray-700">
            Kami berhak, atas kebijakan kami sendiri, untuk memodifikasi atau mengganti syarat ini kapan saja. Jika revisi bersifat material, kami akan memberikan pemberitahuan setidaknya 30 hari sebelum syarat baru berlaku. Penggunaan berkelanjutan Anda atas Aplikasi setelah perubahan tersebut merupakan persetujuan Anda terhadap syarat yang direvisi.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Hukum yang Berlaku</h2>
          <p className="text-gray-700">
            Syarat ini akan diatur dan ditafsirkan sesuai dengan hukum Indonesia, tanpa memperhatikan ketentuan konflik hukumnya.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Hubungi Kami</h2>
          <p className="text-gray-700">
            Jika Anda memiliki pertanyaan tentang Syarat & Ketentuan ini, silakan hubungi kami di:
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
