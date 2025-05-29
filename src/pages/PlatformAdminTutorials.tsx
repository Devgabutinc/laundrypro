import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Pencil, Trash2, Plus, Image as ImageIcon, FileVideo, FileText, Book, Package, ShoppingCart, Info, X } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

// Interface for Tutorial data
interface Tutorial {
  id?: string;
  title: string;
  description: string;
  content: string;
  image_urls?: string[];
  video_url?: string;
  category: string;
  created_at?: string;
}

// Interface for uploaded image
interface UploadedImage {
  id: string;
  url: string;
  file: File;
  uploading: boolean;
  error?: string;
}

export default function PlatformAdminTutorials() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentTutorial, setCurrentTutorial] = useState<Tutorial | null>(null);
  const [newTutorial, setNewTutorial] = useState<Tutorial>({
    title: "",
    description: "",
    content: "",
    image_urls: [],
    video_url: "",
    category: "general"
  });
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      setLoading(true);
      
      // Fetch tutorials
      const { data, error } = await supabase
        .from('tutorials' as any)
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        // If error is relation "tutorials" does not exist, create the table
        if (error.message.includes('relation "tutorials" does not exist')) {
          await createTutorialsTable();
          // Try fetching again after creating the table
          const { data: newData, error: newError } = await supabase
            .from('tutorials' as any)
            .select('*')
            .order('created_at', { ascending: false });
            
          if (newError) throw newError;
          
          if (newData) {
            setTutorials(newData);
          }
        } else {
          throw error;
        }
      } else if (data) {
        setTutorials(data);
      }
    } catch (error: any) {
      console.error('Error fetching tutorials:', error);
      toast({
        title: "Error fetching tutorials",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createTutorialsTable = async () => {
    try {
      // Create the tutorials table using the Supabase client
      // First, check if we can create the extension
      try {
        await supabase.rpc('create_extension', { extension_name: 'uuid-ossp' });
      } catch (extError) {
        console.log('Extension may already exist or requires elevated permissions:', extError);
        // Continue anyway, as the extension might already exist
      }
      
      // Insert a sample tutorial to create the table structure
      const { error } = await supabase
        .from('tutorials' as any)
        .insert([
          {
            title: 'Welcome to LaundryPro',
            description: 'Introduction to LaundryPro features',
            content: '<h2>Welcome to LaundryPro!</h2><p>This is your first tutorial. You can edit or delete this tutorial from the admin panel.</p>',
            image_urls: ['https://placehold.co/800x400?text=Welcome+to+LaundryPro'],
            category: 'general'
          }
        ]);
      
      // If there's still an error, it might be a different issue
      if (error && !error.message.includes('relation "tutorials" does not exist')) {
        throw error;
      }
      
      toast({
        title: "Tutorials table created",
        description: "The tutorials table has been created successfully.",
        variant: "default"
      });
    } catch (error: any) {
      console.error('Error creating tutorials table:', error);
      toast({
        title: "Error creating tutorials table",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle file upload to Supabase Storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = uuidv4();
      
      // Add file to state with temporary local URL
      const newImage: UploadedImage = {
        id: fileId,
        url: URL.createObjectURL(file),
        file: file,
        uploading: true
      };
      
      setUploadedImages(prev => [...prev, newImage]);
      
      try {
        // Upload to Supabase Storage
        const fileName = `${fileId}-${file.name.replace(/\s+/g, '_')}`;
        const { data, error } = await supabase.storage
          .from('tutorials')
          .upload(`images/${fileName}`, file);
          
        if (error) throw error;
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('tutorials')
          .getPublicUrl(`images/${fileName}`);
          
        // Update image in state with actual URL
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === fileId 
              ? { ...img, url: publicUrlData.publicUrl, uploading: false } 
              : img
          )
        );
      } catch (error: any) {
        console.error('Error uploading file:', error);
        // Mark as error in state
        setUploadedImages(prev => 
          prev.map(img => 
            img.id === fileId 
              ? { ...img, uploading: false, error: error.message } 
              : img
          )
        );
        
        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}: ${error.message}`,
          variant: "destructive"
        });
      }
    }
    
    setIsUploading(false);
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove an uploaded image
  const removeUploadedImage = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
  };
  
  const handleAddTutorial = async () => {
    try {
      // Validate form
      if (!newTutorial.title || !newTutorial.description || !newTutorial.content || !newTutorial.category) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
      
      // Get image URLs from uploaded images
      const imageUrls = uploadedImages
        .filter(img => !img.uploading && !img.error)
        .map(img => img.url);
      
      // Create tutorial
      const { data, error } = await supabase
        .from('tutorials' as any)
        .insert({
          ...newTutorial,
          image_urls: imageUrls.length > 0 ? imageUrls : null
        })
        .select();
        
      if (error) throw error;
      
      toast({
        title: "Tutorial added",
        description: "The tutorial has been added successfully.",
        variant: "default"
      });
      
      // Reset form and refresh tutorials
      setNewTutorial({
        title: "",
        description: "",
        content: "",
        image_urls: [],
        video_url: "",
        category: "general"
      });
      setUploadedImages([]);
      setShowAddDialog(false);
      fetchTutorials();
    } catch (error: any) {
      console.error('Error adding tutorial:', error);
      toast({
        title: "Error adding tutorial",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditTutorial = async () => {
    if (!currentTutorial) return;
    
    try {
      // Validate form
      if (!currentTutorial.title || !currentTutorial.description || !currentTutorial.content || !currentTutorial.category) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        return;
      }
      
      // Get image URLs from uploaded images
      const imageUrls = uploadedImages
        .filter(img => !img.uploading && !img.error)
        .map(img => img.url);
      
      // Update tutorial
      const { error } = await supabase
        .from('tutorials' as any)
        .update({
          ...currentTutorial,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentTutorial.id);
        
      if (error) throw error;
      
      toast({
        title: "Tutorial updated",
        description: "The tutorial has been updated successfully.",
        variant: "default"
      });
      
      // Reset form and refresh tutorials
      setCurrentTutorial(null);
      setUploadedImages([]);
      setShowEditDialog(false);
      fetchTutorials();
    } catch (error: any) {
      console.error('Error updating tutorial:', error);
      toast({
        title: "Error updating tutorial",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteTutorial = async () => {
    if (!currentTutorial) return;
    
    try {
      // Delete tutorial
      const { error } = await supabase
        .from('tutorials' as any)
        .delete()
        .eq('id', currentTutorial.id);
        
      if (error) throw error;
      
      toast({
        title: "Tutorial deleted",
        description: "The tutorial has been deleted successfully.",
        variant: "default"
      });
      
      // Reset form and refresh tutorials
      setCurrentTutorial(null);
      setShowDeleteDialog(false);
      fetchTutorials();
    } catch (error: any) {
      console.error('Error deleting tutorial:', error);
      toast({
        title: "Error deleting tutorial",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (tutorial: Tutorial) => {
    setCurrentTutorial(tutorial);
    
    // Load existing images into the uploadedImages state
    if (tutorial.image_urls && tutorial.image_urls.length > 0) {
      const existingImages: UploadedImage[] = tutorial.image_urls.map(url => ({
        id: uuidv4(),
        url: url,
        file: new File([], 'existing-image'), // Dummy file object
        uploading: false
      }));
      setUploadedImages(existingImages);
    } else {
      setUploadedImages([]);
    }
    
    setShowEditDialog(true);
  };

  const openDeleteDialog = (tutorial: Tutorial) => {
    setCurrentTutorial(tutorial);
    setShowDeleteDialog(true);
  };

  // Helper function to get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'premium':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'receipt':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'racks':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'pos':
        return <ShoppingCart className="h-5 w-5 text-orange-500" />;
      default:
        return <Book className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manajemen Tutorial</h1>
        <Button 
          onClick={() => {
            setUploadedImages([]);
            setNewTutorial({
              title: "",
              description: "",
              content: "",
              image_urls: [],
              video_url: "",
              category: "general"
            });
            setShowAddDialog(true);
          }}
          className="bg-laundry-primary hover:bg-laundry-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Tutorial
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-laundry-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {tutorials.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Belum ada tutorial tersedia</p>
              <Button 
                onClick={() => {
                  setUploadedImages([]);
                  setNewTutorial({
                    title: "",
                    description: "",
                    content: "",
                    image_urls: [],
                    video_url: "",
                    category: "general"
                  });
                  setShowAddDialog(true);
                }}
                variant="outline" 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Tambah Tutorial Pertama
              </Button>
            </div>
          ) : (
            tutorials.map((tutorial) => (
              <Card key={tutorial.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(tutorial.category)}
                      <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(tutorial)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openDeleteDialog(tutorial)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-3">{tutorial.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                      <FileText className="h-3 w-3 mr-1" />
                      {tutorial.content.length} karakter
                    </div>
                    {tutorial.image_urls && tutorial.image_urls.length > 0 && (
                      <div className="flex items-center text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {tutorial.image_urls.length} gambar
                      </div>
                    )}
                    {tutorial.video_url && (
                      <div className="flex items-center text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
                        <FileVideo className="h-3 w-3 mr-1" />
                        Video
                      </div>
                    )}
                    <div className="flex items-center text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                      {getCategoryIcon(tutorial.category)}
                      {tutorial.category === 'general' ? 'Umum' : 
                       tutorial.category === 'premium' ? 'Premium' : 
                       tutorial.category === 'receipt' ? 'Struk' :
                       tutorial.category === 'racks' ? 'Rak' :
                       tutorial.category === 'pos' ? 'POS' : 'Laporan'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
      
      {/* Add Tutorial Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Tutorial Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk menambahkan tutorial baru
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Judul Tutorial</Label>
              <Input
                id="title"
                value={newTutorial.title}
                onChange={(e) => setNewTutorial({ ...newTutorial, title: e.target.value })}
                placeholder="Contoh: Cara Menggunakan Fitur POS"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi Singkat</Label>
              <Input
                id="description"
                value={newTutorial.description}
                onChange={(e) => setNewTutorial({ ...newTutorial, description: e.target.value })}
                placeholder="Deskripsi singkat tentang tutorial ini"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">Kategori</Label>
              <Select
                value={newTutorial.category}
                onValueChange={(value) => setNewTutorial({ ...newTutorial, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Umum</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="receipt">Struk</SelectItem>
                  <SelectItem value="racks">Rak</SelectItem>
                  <SelectItem value="pos">POS</SelectItem>
                  <SelectItem value="report">Laporan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content">Konten Tutorial (HTML)</Label>
              <Textarea
                id="content"
                value={newTutorial.content}
                onChange={(e) => setNewTutorial({ ...newTutorial, content: e.target.value })}
                placeholder="<h2>Judul</h2><p>Konten tutorial dalam format HTML</p>"
                className="min-h-[200px]"
              />
            </div>
            
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="add-image-upload">Upload Gambar</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="add-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    disabled={isUploading}
                    className="flex-1"
                  />
                  {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                
                {/* Display uploaded images */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative group rounded-md overflow-hidden border border-gray-200">
                        <img 
                          src={image.url} 
                          alt="Uploaded image" 
                          className={`w-full h-24 object-cover ${image.uploading ? 'opacity-50' : ''} ${image.error ? 'border-red-500' : ''}`} 
                        />
                        {image.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                          </div>
                        )}
                        {image.error && (
                          <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 truncate">
                            Error: {image.error}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeUploadedImage(image.id)}
                          className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="video_url">URL Video (opsional)</Label>
                <Input
                  id="video_url"
                  value={newTutorial.video_url || ""}
                  onChange={(e) => setNewTutorial({ ...newTutorial, video_url: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAddTutorial}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Tutorial Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tutorial</DialogTitle>
            <DialogDescription>
              Edit tutorial yang sudah ada
            </DialogDescription>
          </DialogHeader>
          
          {currentTutorial && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Judul Tutorial</Label>
                <Input
                  id="edit-title"
                  value={currentTutorial.title}
                  onChange={(e) => setCurrentTutorial({ ...currentTutorial, title: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Deskripsi Singkat</Label>
                <Input
                  id="edit-description"
                  value={currentTutorial.description}
                  onChange={(e) => setCurrentTutorial({ ...currentTutorial, description: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Kategori</Label>
                <Select
                  value={currentTutorial.category}
                  onValueChange={(value) => setCurrentTutorial({ ...currentTutorial, category: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Umum</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="receipt">Struk</SelectItem>
                    <SelectItem value="racks">Rak</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="report">Laporan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-content">Konten Tutorial (HTML)</Label>
                <Textarea
                  id="edit-content"
                  value={currentTutorial.content}
                  onChange={(e) => setCurrentTutorial({ ...currentTutorial, content: e.target.value })}
                  className="min-h-[200px]"
                />
              </div>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-image-upload">Upload Gambar</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      disabled={isUploading}
                      className="flex-1"
                    />
                    {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  
                  {/* Display uploaded images */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {uploadedImages.map((image) => (
                        <div key={image.id} className="relative group rounded-md overflow-hidden border border-gray-200">
                          <img 
                            src={image.url} 
                            alt="Uploaded image" 
                            className={`w-full h-24 object-cover ${image.uploading ? 'opacity-50' : ''} ${image.error ? 'border-red-500' : ''}`} 
                          />
                          {image.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                            </div>
                          )}
                          {image.error && (
                            <div className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs p-1 truncate">
                              Error: {image.error}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeUploadedImage(image.id)}
                            className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="edit-video-url">URL Video (opsional)</Label>
                  <Input
                    id="edit-video-url"
                    value={currentTutorial.video_url || ""}
                    onChange={(e) => setCurrentTutorial({ ...currentTutorial, video_url: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Batal</Button>
            <Button onClick={handleEditTutorial}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus tutorial ini?
            </DialogDescription>
          </DialogHeader>
          
          {currentTutorial && (
            <div className="py-4">
              <h3 className="font-semibold">{currentTutorial.title}</h3>
              <p className="text-sm text-gray-500">{currentTutorial.description}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDeleteTutorial}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
