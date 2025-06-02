import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Building, Mail, Phone, Receipt, Crown } from "lucide-react";
import { TenantContext } from "@/contexts/TenantContext";
import { useContext } from "react";
import { useFeature } from "@/hooks/useFeature";

const ProfileSettings = () => {
  const { user, profile, businessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || 'free';
  const { hasAccess: hasReceiptAccess, loading: receiptFeatureLoading } = useFeature('receipt_customization');
  
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
  });
  
  const [businessForm, setBusinessForm] = useState({
    name: "",
    address: "",
    logo_url: "",
    phone: "",
    email: "",
    qris_url: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: ""
  });
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch user profile data
        if (profile) {
          setUserForm({
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            phone: profile.phone || "",
            avatar_url: profile.avatar_url || "",
          });
        }
        
        // Fetch business data
        if (businessId) {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();
            
          if (businessError) throw businessError;
          
          if (businessData) {
            setBusinessForm({
              name: businessData.name || "",
              address: businessData.address || "",
              logo_url: businessData.logo_url || "",
              phone: businessData.phone || "",
              email: businessData.email || user?.email || "",
              qris_url: businessData.qris_url || "",
              bank_name: businessData.bank_name || "",
              bank_account_name: businessData.bank_account_name || "",
              bank_account_number: businessData.bank_account_number || ""
            });
          }
        }
      } catch (error: any) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [profile, businessId, user?.email]);

  const handleUserChange = (e: any) => {
    setUserForm({ ...userForm, [e.target.name]: e.target.value });
  };

  const handleBusinessChange = (e: any) => {
    setBusinessForm({ ...businessForm, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: any, type: "avatar" | "logo" | "qris") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (type === "avatar") setAvatarFile(file);
    if (type === "logo") setLogoFile(file);
    if (type === "qris") setQrisFile(file);
  };

  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from("images").upload(`${folder}/${fileName}`, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(`${folder}/${fileName}`);
    return urlData.publicUrl;
  };

  const handleUserSubmit = async (e: any) => {
    e.preventDefault();
    if (!profile?.id) {
      toast({ title: "User profile not found", variant: "destructive" });
      return;
    }
    
    setSavingUser(true);
    try {
      let avatarUrl = userForm.avatar_url;
      if (avatarFile) avatarUrl = await uploadImage(avatarFile, "avatars");
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          phone: userForm.phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);
        
      if (profileError) throw profileError;
      
      toast({ 
        title: "Profile updated successfully",
        description: "Your profile information has been updated."
      });
      
      // Refresh page to get updated profile
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingUser(false);
    }
  };

  const handleBusinessSubmit = async (e: any) => {
    e.preventDefault();
    if (!businessId) {
      toast({ title: "Business not found", variant: "destructive" });
      return;
    }
    
    setSavingBusiness(true);
    try {
      let logoUrl = businessForm.logo_url;
      let qrisUrl = businessForm.qris_url;
      
      if (logoFile) logoUrl = await uploadImage(logoFile, "logo");
      if (qrisFile) qrisUrl = await uploadImage(qrisFile, "qris");
      
      // Update business
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          name: businessForm.name,
          address: businessForm.address,
          logo_url: logoUrl,
          phone: businessForm.phone,
          email: businessForm.email,
          qris_url: qrisUrl,
          bank_name: businessForm.bank_name,
          bank_account_name: businessForm.bank_account_name,
          bank_account_number: businessForm.bank_account_number
        })
        .eq('id', businessId);
        
      if (businessError) throw businessError;
      
      toast({ 
        title: "Business profile updated successfully",
        description: "Your business information has been updated."
      });
      
      // Refresh page to get updated business data
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: "Error updating business profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingBusiness(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-laundry-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Pengaturan Profil</h1>
      
      <Tabs defaultValue="user" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="user">Profil Pengguna</TabsTrigger>
          <TabsTrigger value="business">Profil Bisnis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="user">
          <Card>
            <CardHeader>
              <CardTitle>Profil Pengguna</CardTitle>
              <CardDescription>
                Kelola informasi profil pengguna Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                  <div className="flex flex-col items-center">
                    <Avatar className="h-24 w-24 mb-2">
                      {userForm.avatar_url || avatarFile ? (
                        <AvatarImage 
                          src={avatarFile ? URL.createObjectURL(avatarFile) : userForm.avatar_url} 
                          alt={`${userForm.first_name} ${userForm.last_name}`} 
                        />
                      ) : null}
                      <AvatarFallback className="text-2xl">
                        {userForm.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mt-2">
                      <Label htmlFor="avatar" className="cursor-pointer text-sm text-blue-600 hover:underline">
                        Ubah Foto
                      </Label>
                      <Input 
                        id="avatar" 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleFileChange(e, "avatar")} 
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">Nama Depan</Label>
                        <div className="flex mt-1">
                          <div className="bg-gray-100 p-2 rounded-l-md">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                          <Input
                            id="first_name"
                            name="first_name"
                            value={userForm.first_name}
                            onChange={handleUserChange}
                            className="rounded-l-none"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="last_name">Nama Belakang</Label>
                        <Input
                          id="last_name"
                          name="last_name"
                          value={userForm.last_name}
                          onChange={handleUserChange}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <div className="flex mt-1">
                        <div className="bg-gray-100 p-2 rounded-l-md">
                          <Mail className="h-5 w-5 text-gray-500" />
                        </div>
                        <Input
                          id="email"
                          name="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-gray-50 rounded-l-none"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Nomor Telepon</Label>
                      <div className="flex mt-1">
                        <div className="bg-gray-100 p-2 rounded-l-md">
                          <Phone className="h-5 w-5 text-gray-500" />
                        </div>
                        <Input
                          id="phone"
                          name="phone"
                          value={userForm.phone}
                          onChange={handleUserChange}
                          placeholder="Contoh: 628123456789"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={savingUser}>
                    {savingUser ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Profil Bisnis</CardTitle>
              <CardDescription>
                Kelola informasi bisnis Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBusinessSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 mb-6">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden mb-2">
                      {businessForm.logo_url || logoFile ? (
                        <img 
                          src={logoFile ? URL.createObjectURL(logoFile) : businessForm.logo_url} 
                          alt={businessForm.name} 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <div className="mt-2">
                      <Label htmlFor="logo" className="cursor-pointer text-sm text-blue-600 hover:underline">
                        Ubah Logo
                      </Label>
                      <Input 
                        id="logo" 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleFileChange(e, "logo")} 
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="name">Nama Bisnis <span className="text-red-500">*</span></Label>
                      <div className="flex mt-1">
                        <div className="bg-gray-100 p-2 rounded-l-md">
                          <Building className="h-5 w-5 text-gray-500" />
                        </div>
                        <Input
                          id="name"
                          name="name"
                          value={businessForm.name}
                          onChange={handleBusinessChange}
                          required
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Alamat <span className="text-red-500">*</span></Label>
                      <Input
                        id="address"
                        name="address"
                        value={businessForm.address}
                        onChange={handleBusinessChange}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="business_phone">No. Telepon Bisnis</Label>
                        <Input
                          id="business_phone"
                          name="phone"
                          value={businessForm.phone}
                          onChange={handleBusinessChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_email">Email Bisnis</Label>
                        <Input
                          id="business_email"
                          name="email"
                          value={businessForm.email}
                          onChange={handleBusinessChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-4">Informasi Pembayaran</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="qris">QRIS (Upload Gambar)</Label>
                      <Input 
                        id="qris" 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleFileChange(e, "qris")}
                      />
                      {(qrisFile || businessForm.qris_url) && (
                        <div className="mt-2 border p-2 rounded">
                          <img 
                            src={qrisFile ? URL.createObjectURL(qrisFile) : businessForm.qris_url} 
                            alt="QRIS" 
                            className="h-32 mx-auto"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="bank_name">Nama Bank</Label>
                        <Input
                          id="bank_name"
                          name="bank_name"
                          value={businessForm.bank_name}
                          onChange={handleBusinessChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank_account_name">Nama Pemilik Rekening</Label>
                        <Input
                          id="bank_account_name"
                          name="bank_account_name"
                          value={businessForm.bank_account_name}
                          onChange={handleBusinessChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank_account_number">No. Rekening</Label>
                        <Input
                          id="bank_account_number"
                          name="bank_account_number"
                          value={businessForm.bank_account_number}
                          onChange={handleBusinessChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Pengaturan Struk */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-4">Pengaturan Tambahan</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer" 
                      onClick={() => {
                        if (hasReceiptAccess) {
                          navigate('/receipt-settings');
                        } else {
                          toast({
                            title: "Fitur Terbatas",
                            description: "Fitur kustomisasi struk tidak tersedia untuk akun Anda. Hubungi admin untuk informasi lebih lanjut.",
                            variant: "destructive"
                          });
                          navigate('/settings');
                        }
                      }}>
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <Receipt className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Kustomisasi Struk</h4>
                          <p className="text-sm text-gray-500">Sesuaikan tampilan struk untuk bisnis Anda</p>
                        </div>
                      </div>
                      {hasReceiptAccess ? (
                        <div className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">
                          <Crown className="h-3 w-3" />
                          <span>Premium</span>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" disabled onClick={(e) => {
                          e.stopPropagation();
                        }}>
                          Upgrade Premium
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <Button type="submit" disabled={savingBusiness}>
                    {savingBusiness ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfileSettings;