import { createContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Define tenant interface
export interface Tenant {
  id: string;
  businessName: string;
  address?: string;
  phone?: string;
  status?: string; // status: 'free' | 'premium' | 'suspended'
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  whatsappNumber?: string;
}

// Sample tenant data (this would come from an API in a real implementation)
const defaultTenant: Tenant = {
  id: "01ead97f-6fc1-4dc2-86a3-bf5dad25293b",
  businessName: "dev",
  status: "free",
  logo: undefined,
};

// Define context interface
interface TenantContextType {
  tenant: Tenant | null;
  updateTenant: (newTenant: Partial<Tenant>) => void;
}

// Create context
export const TenantContext = createContext<TenantContextType>({
  tenant: null,
  updateTenant: () => {},
});

// Create provider component
export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const { businessId } = useAuth();

  useEffect(() => {
    const fetchTenant = async () => {
      if (!businessId) return;
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, address, phone, status, logo_url")
        .eq("id", businessId)
        .single();
      if (data && !error) {
        setTenant({
          id: data.id,
          businessName: data.name,
          address: data.address,
          phone: data.phone,
          status: data.status,
          logo: data.logo_url,
        });
      } else {
        setTenant(defaultTenant);
      }
    };
    fetchTenant();
  }, [businessId]);

  const updateTenant = (newTenant: Partial<Tenant>) => {
    setTenant(prev => {
      if (!prev) return null;
      return { ...prev, ...newTenant };
    });
  };

  return (
    <TenantContext.Provider value={{ tenant, updateTenant }}>
      {children}
    </TenantContext.Provider>
  );
};
