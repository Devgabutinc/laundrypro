import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Book, FileText, Package, ShoppingCart, Info, X } from "lucide-react";

// Interface for Tutorial data
interface Tutorial {
  id: string;
  title: string;
  description: string;
  content: string;
  image_urls?: string[]; // Array of image URLs
  video_url?: string;
  category: string;
}

// Mock data for tutorials
const mockTutorials: Tutorial[] = [
  {
    id: "1",
    title: "Perbandingan Free vs Premium",
    description: "Perbedaan fitur antara paket gratis dan premium di LaundryPro",
    content: `
      <h2>Perbedaan Paket Free dan Premium</h2>
      <p>LaundryPro menyediakan dua paket layanan untuk memenuhi kebutuhan bisnis laundry Anda:</p>
      <h3>Paket Free:</h3>
      <ul>
        <li>Manajemen pesanan dasar</li>
        <li>Pencetakan struk sederhana</li>
        <li>Laporan keuangan dasar</li>
        <li>Manajemen pelanggan</li>
        <li>Batas penggunaan POS harian</li>
      </ul>
      <h3>Paket Premium:</h3>
      <ul>
        <li>Semua fitur Free</li>
        <li>Manajemen rak</li>
        <li>Notifikasi pelanggan</li>
        <li>Ekspor data ke Excel dan PDF</li>
        <li>Kustomisasi struk</li>
        <li>Penggunaan POS tidak terbatas</li>
        <li>Laporan keuangan detail</li>
        <li>Fitur diskusi tim</li>
      </ul>
    `,
    image_urls: [
      'https://placehold.co/800x400?text=Premium+vs+Free+1',
      'https://placehold.co/800x400?text=Premium+vs+Free+2',
    ],
    category: "premium"
  },
  {
    id: "2",
    title: "Cara Menggunakan POS",
    description: "Panduan lengkap menggunakan Point of Sale untuk transaksi",
    content: `
      <h2>Panduan Menggunakan POS LaundryPro</h2>
      <p>Point of Sale (POS) adalah fitur utama untuk mencatat transaksi di LaundryPro. Berikut langkah-langkah menggunakannya:</p>
      <ol>
        <li>Buka menu POS dari dashboard</li>
        <li>Pilih pelanggan atau tambahkan pelanggan baru</li>
        <li>Tambahkan layanan yang diinginkan</li>
        <li>Atur jumlah dan harga jika diperlukan</li>
        <li>Pilih metode pembayaran</li>
        <li>Klik "Proses Pembayaran"</li>
        <li>Cetak struk atau kirim via WhatsApp</li>
      </ol>
      <p>Untuk pengguna paket Free, penggunaan POS dibatasi hingga 10 transaksi per hari. Pengguna Premium tidak memiliki batasan ini.</p>
    `,
    image_urls: [
      'https://placehold.co/800x400?text=POS+Tutorial+1',
      'https://placehold.co/800x400?text=POS+Tutorial+2',
      'https://placehold.co/800x400?text=POS+Tutorial+3',
    ],
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    category: "pos"
  },
  {
    id: "3",
    title: "Manajemen Rak",
    description: "Cara mengatur dan melacak pakaian dengan sistem rak",
    content: `
      <h2>Manajemen Rak LaundryPro</h2>
      <p>Fitur manajemen rak membantu Anda mengorganisir dan melacak pakaian pelanggan dengan mudah. Berikut cara menggunakannya:</p>
      <ol>
        <li>Buka menu Rak dari dashboard</li>
        <li>Tambahkan rak baru dengan mengklik "Tambah Rak"</li>
        <li>Beri nama rak (misalnya: Rak A, Rak B, dll)</li>
        <li>Saat memproses pesanan, pilih rak tempat pakaian disimpan</li>
        <li>Gunakan fitur scan untuk mencari pesanan berdasarkan rak</li>
      </ol>
      <p>Fitur ini hanya tersedia untuk pengguna Premium.</p>
    `,
    image_urls: [
      'https://placehold.co/800x400?text=Rack+Management+1',
    ],
    category: "racks"
  },
  {
    id: "4",
    title: "Kustomisasi Struk",
    description: "Cara mengatur tampilan dan informasi pada struk",
    content: `
      <h2>Kustomisasi Struk LaundryPro</h2>
      <p>LaundryPro memungkinkan Anda untuk mengkustomisasi struk sesuai dengan kebutuhan bisnis Anda. Berikut langkah-langkahnya:</p>
      <ol>
        <li>Buka menu Pengaturan</li>
        <li>Pilih "Pengaturan Struk"</li>
        <li>Upload logo bisnis Anda</li>
        <li>Tambahkan informasi kontak dan alamat</li>
        <li>Atur pesan footer (misalnya: "Terima kasih telah menggunakan jasa kami")</li>
        <li>Aktifkan/nonaktifkan tampilan QR code</li>
        <li>Simpan perubahan</li>
      </ol>
      <p>Kustomisasi struk lengkap hanya tersedia untuk pengguna Premium. Pengguna Free hanya dapat mengubah informasi dasar.</p>
    `,
    image_urls: [
      'https://placehold.co/800x400?text=Receipt+Customization+1',
      'https://placehold.co/800x400?text=Receipt+Customization+2',
    ],
    category: "receipt"
  },
  {
    id: "5",
    title: "Laporan Keuangan",
    description: "Cara melihat dan menganalisis laporan keuangan bisnis",
    content: `
      <h2>Laporan Keuangan LaundryPro</h2>
      <p>Fitur laporan keuangan membantu Anda memantau performa bisnis laundry. Berikut cara mengaksesnya:</p>
      <ol>
        <li>Buka menu Laporan dari dashboard</li>
        <li>Pilih jenis laporan (harian, mingguan, bulanan, atau kustom)</li>
        <li>Atur rentang tanggal jika memilih laporan kustom</li>
        <li>Lihat grafik pendapatan dan jumlah pesanan</li>
        <li>Analisis layanan terpopuler dan pelanggan teratas</li>
        <li>Ekspor laporan ke Excel atau PDF (Premium)</li>
      </ol>
      <p>Pengguna Free hanya dapat melihat laporan dasar, sementara pengguna Premium mendapatkan analisis mendalam dan kemampuan ekspor.</p>
    `,
    image_urls: [
      'https://placehold.co/800x400?text=Financial+Reports+1',
    ],
    category: "general"
  }
];

export default function Tutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[]>(mockTutorials);
  const [loading, setLoading] = useState(true);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchTutorials();
  }, []);
  
  const fetchTutorials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tutorials' as any)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        // If the table doesn't exist, just use mock data without showing an error
        if (error.message && error.message.includes('relation "tutorials" does not exist')) {
          console.log('Tutorials table does not exist yet, using mock data');
          setTutorials(mockTutorials);
        } else {
          console.error('Error fetching tutorials:', error);
          toast({
            title: "Error",
            description: "Failed to load tutorials. Please try again later.",
            variant: "destructive"
          });
          // Fallback to mock data
          setTutorials(mockTutorials);
        }
      } else if (data && data.length > 0) {
        setTutorials(data);
      } else {
        // If no tutorials found, use mock data as fallback
        setTutorials(mockTutorials);
      }
    } catch (error) {
      console.error('Error:', error);
      setTutorials(mockTutorials); // Fallback to mock data
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTutorial = (tutorial: Tutorial) => {
    setSelectedTutorial(tutorial);
    setShowTutorialModal(true);
  };

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'premium':
        return <Info className="h-10 w-10 text-blue-500 mb-2" />;
      case 'receipt':
        return <FileText className="h-10 w-10 text-green-500 mb-2" />;
      case 'racks':
        return <Package className="h-10 w-10 text-purple-500 mb-2" />;
      case 'pos':
        return <ShoppingCart className="h-10 w-10 text-orange-500 mb-2" />;
      default:
        return <Book className="h-10 w-10 text-gray-500 mb-2" />;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tutorial LaundryPro</h1>
        <p className="text-muted-foreground">Panduan penggunaan aplikasi LaundryPro</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-laundry-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {tutorials.map((tutorial) => (
            <Card 
              key={tutorial.id} 
              className="rounded-lg shadow border-0 bg-white cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenTutorial(tutorial)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                {getCategoryIcon(tutorial.category)}
                <h3 className="font-semibold text-gray-800 mb-1">{tutorial.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{tutorial.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tutorial Modal */}
      {selectedTutorial && (
        <Dialog open={showTutorialModal} onOpenChange={setShowTutorialModal}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 z-10" 
              onClick={() => setShowTutorialModal(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <DialogHeader>
              <DialogTitle className="text-center text-lg font-bold text-gray-800">
                {selectedTutorial.title}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                {selectedTutorial.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Image Gallery - Support multiple images */}
              <div className="rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                {selectedTutorial.image_urls && selectedTutorial.image_urls.length > 0 ? (
                  <div className="image-gallery">
                    {/* Main Image */}
                    <img 
                      src={selectedTutorial.image_urls[0]} 
                      alt={`${selectedTutorial.title} - gambar utama`}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://placehold.co/800x400?text=Tutorial+Image';
                      }}
                    />
                    
                    {/* Thumbnail Gallery - Only show if there are multiple images */}
                    {selectedTutorial.image_urls.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                        {selectedTutorial.image_urls.map((imgUrl, index) => (
                          <div 
                            key={index} 
                            className="min-w-[80px] h-[60px] rounded-md overflow-hidden border-2 border-gray-300 cursor-pointer hover:border-[#F76B3C] transition-colors"
                            onClick={() => {
                              // Create a temporary array to reorder images
                              const reorderedImages = [...selectedTutorial.image_urls!];
                              // Move clicked image to first position
                              const clickedImage = reorderedImages.splice(index, 1)[0];
                              reorderedImages.unshift(clickedImage);
                              // Update tutorial with reordered images
                              setSelectedTutorial({
                                ...selectedTutorial,
                                image_urls: reorderedImages
                              });
                            }}
                          >
                            <img 
                              src={imgUrl} 
                              alt={`${selectedTutorial.title} - thumbnail ${index+1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://placehold.co/80x60?text=Thumbnail';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                    <p className="text-gray-500 text-sm">Gambar tutorial akan ditampilkan di sini</p>
                  </div>
                )}
              </div>
              
              {/* Tutorial Video - Only show if available */}
              {selectedTutorial.video_url && (
                <div className="rounded-md overflow-hidden border border-gray-200 mt-4">
                  <video 
                    controls
                    className="w-full h-auto"
                    poster="https://placehold.co/800x400?text=Tutorial+Video"
                  >
                    <source src={selectedTutorial.video_url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
              
              {/* Tutorial Content */}
              <div className="prose prose-sm max-w-none mt-4 bg-white p-4 rounded-md border border-gray-200">
                <div dangerouslySetInnerHTML={{ __html: selectedTutorial.content }} />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                className="w-full bg-[#F76B3C] hover:bg-[#e65a2d]" 
                onClick={() => setShowTutorialModal(false)}
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          <strong>Catatan:</strong> Tutorial ini akan diperbarui secara berkala. Data tutorial akan dikelola melalui platform admin.
        </p>
      </div>
    </div>
  );
}
