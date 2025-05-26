import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const BusinessProfileSetup = () => {
  const { user, profile, businessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    address: "",
    logo_url: "",
    phone: "",
    email: user?.email || "",
    qris_url: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Redirect jika sudah ada businessId
  if (businessId) {
    window.location.href = "/";
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "qris") => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.email) {
      toast({ title: "Isi semua field wajib!", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let logoUrl = form.logo_url;
      let qrisUrl = form.qris_url;
      if (logoFile) logoUrl = await uploadImage(logoFile, "logo");
      if (qrisFile) qrisUrl = await uploadImage(qrisFile, "qris");
      // Insert bisnis dan ambil id langsung
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({ ...form, logo_url: logoUrl, qris_url: qrisUrl })
        .select('id')
        .single();
      if (businessError) throw businessError;
      if (!business || !business.id) throw new Error('Gagal mendapatkan ID bisnis');
      // Update profile user
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ business_id: business.id })
        .eq('id', profile.id);
      if (profileError) {
        toast({ title: "Gagal update profile", description: profileError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      toast({ title: "Profil bisnis berhasil disimpan" });
      window.location.href = "/";
    } catch (error: any) {
      toast({ title: "Gagal simpan profil bisnis", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Lengkapi Profil Bisnis</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label>Nama Usaha <span className="text-red-500">*</span></Label>
          <Input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <Label>Alamat <span className="text-red-500">*</span></Label>
          <Input name="address" value={form.address} onChange={handleChange} required />
        </div>
        <div>
          <Label>Logo Usaha <span className="text-red-500">*</span></Label>
          <Input type="file" accept="image/*" onChange={e => handleFileChange(e, "logo")}/>
          {logoFile && <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="h-20 mt-2 rounded" />}
          {!logoFile && form.logo_url && <img src={form.logo_url} alt="Logo preview" className="h-20 mt-2 rounded" />}
        </div>
        <div>
          <Label>No. Telepon</Label>
          <Input name="phone" value={form.phone} onChange={handleChange} />
        </div>
        <div>
          <Label>Email <span className="text-red-500">*</span></Label>
          <Input name="email" value={form.email} onChange={handleChange} required />
        </div>
        <div>
          <Label>QRIS (Upload Gambar)</Label>
          <Input type="file" accept="image/*" onChange={e => handleFileChange(e, "qris")}/>
          {qrisFile && <img src={URL.createObjectURL(qrisFile)} alt="QRIS preview" className="h-20 mt-2 rounded" />}
          {!qrisFile && form.qris_url && <img src={form.qris_url} alt="QRIS preview" className="h-20 mt-2 rounded" />}
        </div>
        <div>
          <Label>Nama Bank</Label>
          <Input name="bank_name" value={form.bank_name} onChange={handleChange} />
        </div>
        <div>
          <Label>Nama Pemilik Rekening</Label>
          <Input name="bank_account_name" value={form.bank_account_name} onChange={handleChange} />
        </div>
        <div>
          <Label>No. Rekening</Label>
          <Input name="bank_account_number" value={form.bank_account_number} onChange={handleChange} />
        </div>
        <Button type="submit" disabled={saving} className="w-full mt-4 text-lg py-3">
          {saving ? "Menyimpan..." : "Simpan Profil Bisnis"}
        </Button>
      </form>
    </div>
  );
};

export default BusinessProfileSetup; 