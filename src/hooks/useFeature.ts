import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TenantContext } from '@/contexts/TenantContext';

/**
 * Hook untuk memeriksa apakah pengguna memiliki akses ke fitur tertentu
 * berdasarkan status langganan mereka (free/premium)
 */
export function useFeature(featureName: string) {
  const { tenant } = useContext(TenantContext);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featureSettings, setFeatureSettings] = useState<Record<string, { is_free: boolean; is_premium: boolean }> | null>(null);

  // Selalu ambil pengaturan fitur terbaru dari database
  useEffect(() => {
    const fetchFeatureSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('feature_settings')
          .select('feature_name, is_free, is_premium');

        if (error) {
          throw new Error(`Gagal memuat pengaturan fitur: ${error.message}`);
        }

        // Simpan ke state lokal
        const settings: Record<string, { is_free: boolean; is_premium: boolean }> = {};
        data?.forEach(feature => {
          settings[feature.feature_name] = {
            is_free: feature.is_free,
            is_premium: feature.is_premium
          };
        });
        setFeatureSettings(settings);
      } catch (err: any) {
        // Error handled by setting error state
        setError(err.message);
      }
    };

    fetchFeatureSettings();
  }, []); // Hanya dijalankan sekali saat komponen dimount

  // Periksa akses fitur setiap kali tenant atau featureSettings berubah
  useEffect(() => {
    const checkFeatureAccess = async () => {
      try {
        setLoading(true);
        setError(null);

        // Pengecekan akses fitur

        // Jika tenant atau featureSettings belum tersedia, belum bisa menentukan akses
        if (!tenant || !featureSettings) {
          // Tenant atau featureSettings belum tersedia
          setHasAccess(null);
          return;
        }

        // Cek apakah fitur ada di settings
        const featureSetting = featureSettings[featureName];
        // Check feature settings
        
        if (!featureSetting) {
          // Fitur tidak ditemukan di pengaturan
          setHasAccess(false);
          return;
        }

        // Tentukan akses berdasarkan status tenant dan pengaturan fitur
        const isPremium = tenant.status === 'premium';
        // Check if user is premium
        
        if (isPremium) {
          // Atur akses untuk pengguna premium
          setHasAccess(featureSetting.is_premium);
        } else {
          // Asumsi status free jika bukan premium
          // Atur akses untuk pengguna free
          setHasAccess(featureSetting.is_free);
        }
      } catch (err: any) {
        // Error handled by setting error state
        setError(err.message);
        setHasAccess(false); // Default ke tidak ada akses jika terjadi error
      } finally {
        setLoading(false);
      }
    };

    checkFeatureAccess();
  }, [featureName, tenant, featureSettings]);

  // Fungsi untuk memaksa refresh pengaturan fitur dari database
  const refreshFeatureAccess = async () => {
    try {
      // Refreshing feature settings from database
      setLoading(true);
      const { data, error } = await supabase
        .from('feature_settings')
        .select('feature_name, is_free, is_premium');

      if (error) {
        throw new Error(`Gagal memuat pengaturan fitur: ${error.message}`);
      }

      // Process updated feature settings

      // Simpan ke state lokal
      const settings: Record<string, { is_free: boolean; is_premium: boolean }> = {};
      data?.forEach(feature => {
        settings[feature.feature_name] = {
          is_free: feature.is_free,
          is_premium: feature.is_premium
        };
      });
      
      // Update settings object
      setFeatureSettings(settings);
      
      // Recalcular acceso inmediatamente para la característica actual
      const currentFeature = settings[featureName];
      if (currentFeature) {
        const isPremium = tenant?.status === 'premium';
        if (isPremium) {
          setHasAccess(currentFeature.is_premium);
        } else {
          setHasAccess(currentFeature.is_free);
        }
        // Update access for current feature
      }
      
      return true;
    } catch (err: any) {
      // Error handled by setting error state
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { hasAccess, loading, error, refreshFeatureAccess };
}
