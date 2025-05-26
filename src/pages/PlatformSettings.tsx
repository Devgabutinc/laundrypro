import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Check, AlertCircle, Save, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFeature } from "@/hooks/useFeature";

interface FeatureSetting {
  id: number;
  feature_name: string;
  label: string;
  description?: string;
  is_free: boolean;
  is_premium: boolean;
  category?: string;
}

interface PlatformSetting {
  id: number;
  max_user_free: number;
  max_user_premium: number;
  max_pos_usage_free: number;
  max_pos_usage_premium: number;
}

// Define feature categories
const CATEGORIES = {
  POS: "Point of Sale",
  ORDER: "Order Management",
  REPORT: "Laporan & Export",
  MISC: "Fitur Lainnya"
};

// Define default features if none exist in the database
const DEFAULT_FEATURES: Omit<FeatureSetting, "id">[] = [
  {
    feature_name: "racks",
    label: "Rak & Lokasi Penyimpanan",
    description: "Memungkinkan pengguna untuk menetapkan dan mengelola lokasi penyimpanan cucian pada rak",
    is_free: false,
    is_premium: true,
    category: "ORDER"
  },
  {
    feature_name: "receipt_customization",
    label: "Kustomisasi Struk",
    description: "Memungkinkan pengguna untuk menyesuaikan tampilan struk, termasuk header, footer, dan QR code",
    is_free: false,
    is_premium: true,
    category: "POS"
  },
  {
    feature_name: "print_receipt",
    label: "Logo Pada Struk",
    description: "Menampilkan logo usaha pada struk transaksi yang dicetak",
    is_free: false,
    is_premium: true,
    category: "POS"
  },
  {
    feature_name: "financial_reports",
    label: "Export Laporan Keuangan",
    description: "Kemampuan untuk mengekspor data laporan keuangan dalam format Excel/CSV",
    is_free: false,
    is_premium: true,
    category: "REPORT"
  },
  {
    feature_name: "export_data",
    label: "Export Data Pelanggan & Arsip",
    description: "Kemampuan untuk mengekspor data pelanggan dan arsip pesanan dalam format Excel/CSV",
    is_free: false,
    is_premium: true,
    category: "REPORT"
  },
  {
    feature_name: "discussion",
    label: "Forum Diskusi",
    description: "Akses ke menu forum diskusi untuk berinteraksi dengan pengguna lain",
    is_free: true,
    is_premium: true,
    category: "MISC"
  },
  {
    feature_name: "notifications",
    label: "Notifikasi & Pengingat",
    description: "Akses ke menu notifikasi untuk mengirim pengingat ke pelanggan",
    is_free: false,
    is_premium: true,
    category: "MISC"
  },
  {
    feature_name: "order_tracking",
    label: "Pelacakan Pesanan",
    description: "Akses ke menu pelacakan pesanan untuk memantau status cucian",
    is_free: true,
    is_premium: true,
    category: "ORDER"
  }
];

const PlatformSettings = () => {
  const [features, setFeatures] = useState<FeatureSetting[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting>({
    id: 1,
    max_user_free: 3,
    max_user_premium: 20,
    max_pos_usage_free: 10,
    max_pos_usage_premium: 0
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPlatformSettings, setSavingPlatformSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  // Gunakan hook useFeature untuk mendapatkan fungsi refreshFeatureAccess
  const { refreshFeatureAccess } = useFeature("export_data");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      // Fetch feature settings
      const { data: featureData, error: featureError } = await supabase
        .from("feature_settings")
        .select("id, feature_name, label, is_free, is_premium");
      
      if (featureError) {
        setError(featureError.message);
        setLoading(false);
        return;
      }
      
      if (featureData && featureData.length > 0) {
        // Add default category and description if they don't exist
        const enhancedData = featureData.map(item => ({
          ...item,
          description: "", // Default empty description
          category: "MISC" // Default category
        }));
        setFeatures(enhancedData as FeatureSetting[]);
      } else {
        // If no features exist in the database, create them from defaults
        await createDefaultFeatures();
      }
      
      // Fetch platform settings
      const { data: platformData, error: platformError } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1);
      
      if (platformError) {
        setError(platformError.message);
      } else if (platformData && platformData.length > 0) {
        // Menggunakan unknown sebagai intermediate type untuk type conversion yang aman
        setPlatformSettings(platformData[0] as unknown as PlatformSetting);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, []);

  const createDefaultFeatures = async () => {
    const createdFeatures: FeatureSetting[] = [];
    let hasError = false;
    
    for (const feature of DEFAULT_FEATURES) {
      const { data, error } = await supabase
        .from("feature_settings")
        .insert(feature)
        .select();
        
      if (error) {
        hasError = true;
        console.error(`Error creating feature ${feature.feature_name}:`, error);
      } else if (data && data.length > 0) {
        createdFeatures.push(data[0] as FeatureSetting);
      }
    }
    
    if (hasError) {
      setError("Beberapa fitur gagal dibuat. Silakan refresh halaman.");
    } else {
      setFeatures(createdFeatures);
    }
  };

  const handleChange = (id: number, key: "is_free" | "is_premium", value: boolean) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Update each feature setting in the database
      for (const feature of features) {
        const { error } = await supabase
          .from("feature_settings")
          .update({
            is_free: feature.is_free,
            is_premium: feature.is_premium
          })
          .eq("id", feature.id);
        
        if (error) throw error;
      }
      
      // Refresh feature settings cache setelah perubahan disimpan
      await refreshFeatureAccess();
      
      setSuccess("Pengaturan fitur berhasil disimpan");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      setError(`Gagal menyimpan pengaturan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  
  const handlePlatformSettingChange = (key: keyof PlatformSetting, value: number) => {
    setPlatformSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatformSettings(true);
    setError(null);
    setSuccess(null);
    
    const { error } = await supabase
      .from("platform_settings")
      .update({
        max_user_free: platformSettings.max_user_free,
        max_user_premium: platformSettings.max_user_premium,
        max_pos_usage_free: platformSettings.max_pos_usage_free,
        max_pos_usage_premium: platformSettings.max_pos_usage_premium
      })
      .eq("id", platformSettings.id);
    
    setSavingPlatformSettings(false);
    
    if (error) {
      setError("Gagal menyimpan pengaturan platform!");
      console.error("Error updating platform settings:", error);
    } else {
      setSuccess("Pengaturan platform berhasil disimpan!");
    }
  };

  // Group features by category
  const getFeaturesByCategory = () => {
    const grouped: Record<string, FeatureSetting[]> = {};
    
    features.forEach(feature => {
      const category = feature.category || "MISC";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(feature);
    });
    
    return grouped;
  };

  const featuresByCategory = getFeaturesByCategory();
  const categories = Object.keys(featuresByCategory);

  return (
    <div className="container py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl font-bold">Pengaturan Fitur LaundryPro</h1>
        <p className="text-muted-foreground">Atur fitur mana yang tersedia untuk pengguna Free dan Premium</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Berhasil</AlertTitle>
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-laundry-primary" />
          <span className="ml-2 text-lg">Memuat pengaturan...</span>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" /> 
                Pengaturan Batasan Platform
              </CardTitle>
              <CardDescription>
                Atur batasan penggunaan fitur untuk pengguna Free dan Premium
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Batasan Pengguna</h3>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="max_user_free">Maksimal Pengguna (Free)</Label>
                        <Input
                          id="max_user_free"
                          type="number"
                          value={platformSettings.max_user_free}
                          onChange={(e) => handlePlatformSettingChange('max_user_free', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_user_premium">Maksimal Pengguna (Premium)</Label>
                        <Input
                          id="max_user_premium"
                          type="number"
                          value={platformSettings.max_user_premium}
                          onChange={(e) => handlePlatformSettingChange('max_user_premium', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Batasan Penggunaan POS</h3>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="max_pos_usage_free">Maksimal Penggunaan POS per Hari (Free)</Label>
                        <Input
                          id="max_pos_usage_free"
                          type="number"
                          value={platformSettings.max_pos_usage_free}
                          onChange={(e) => handlePlatformSettingChange('max_pos_usage_free', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Jumlah maksimal penggunaan POS per hari untuk pengguna Free</p>
                      </div>
                      <div>
                        <Label htmlFor="max_pos_usage_premium">Maksimal Penggunaan POS per Hari (Premium)</Label>
                        <Input
                          id="max_pos_usage_premium"
                          type="number"
                          value={platformSettings.max_pos_usage_premium}
                          onChange={(e) => handlePlatformSettingChange('max_pos_usage_premium', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Masukkan 0 untuk penggunaan tidak terbatas</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSavePlatformSettings} 
                disabled={savingPlatformSettings}
                className="bg-laundry-primary hover:bg-orange-600"
              >
                {savingPlatformSettings ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Simpan Pengaturan Platform
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Semua Fitur</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {CATEGORIES[category as keyof typeof CATEGORIES] || category}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Semua Fitur LaundryPro</CardTitle>
                  <CardDescription>
                    Daftar lengkap semua fitur yang tersedia di aplikasi LaundryPro
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {features.map(feature => (
                      <div key={feature.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">{feature.label}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${feature.category === "POS" ? "bg-blue-100 text-blue-800" : 
                                   feature.category === "ORDER" ? "bg-purple-100 text-purple-800" :
                                   feature.category === "NOTIFICATION" ? "bg-green-100 text-green-800" :
                                   feature.category === "REPORT" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                              {CATEGORIES[feature.category as keyof typeof CATEGORIES] || "Lainnya"}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">{feature.description || "Tidak ada deskripsi"}</p>
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`free-${feature.id}`}
                              checked={feature.is_free}
                              onCheckedChange={(checked) => handleChange(feature.id, "is_free", checked)}
                            />
                            <label htmlFor={`free-${feature.id}`} className="text-sm font-medium">Free</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`premium-${feature.id}`}
                              checked={feature.is_premium}
                              onCheckedChange={(checked) => handleChange(feature.id, "is_premium", checked)}
                            />
                            <label htmlFor={`premium-${feature.id}`} className="text-sm font-medium">Premium</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-laundry-primary hover:bg-orange-600"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Perubahan
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{CATEGORIES[category as keyof typeof CATEGORIES] || category}</CardTitle>
                    <CardDescription>
                      Kelola fitur dalam kategori {CATEGORIES[category as keyof typeof CATEGORIES] || category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {featuresByCategory[category].map(feature => (
                        <div key={feature.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{feature.label}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">{feature.description || "Tidak ada deskripsi"}</p>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`cat-free-${feature.id}`}
                                checked={feature.is_free}
                                onCheckedChange={(checked) => handleChange(feature.id, "is_free", checked)}
                              />
                              <label htmlFor={`cat-free-${feature.id}`} className="text-sm font-medium">Free</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`cat-premium-${feature.id}`}
                                checked={feature.is_premium}
                                onCheckedChange={(checked) => handleChange(feature.id, "is_premium", checked)}
                              />
                              <label htmlFor={`cat-premium-${feature.id}`} className="text-sm font-medium">Premium</label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="bg-laundry-primary hover:bg-orange-600"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Simpan Perubahan
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default PlatformSettings; 