import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useContext, useEffect, useState } from "react";
import { TenantContext } from "@/contexts/TenantContext";
import { NavLink } from "react-router-dom";
import { MessageSquare, Clock, Check, Send, ShoppingCart, Package, BarChart3, Archive, Users, Settings, MessagesSquare, ArchiveRestore, Bell, UserCog } from "lucide-react";

// Helper sederhana untuk cek akses fitur
function canAccessFeature(featureName, tenantStatus, featureSettings) {
  const feature = featureSettings?.find(f => f.feature_name === featureName);
  if (!feature) return false;
  if (tenantStatus === "premium") return feature.is_premium;
  return feature.is_free;
}

export function AppSidebar() {
  const { tenant } = useContext(TenantContext);
  const [featureSettings, setFeatureSettings] = useState([]);
  const tenantStatus = tenant?.status || "free";

  useEffect(() => {
    const fetchFeatureSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) setFeatureSettings(data);
    };
    fetchFeatureSettings();
  }, []);

  const menuItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: () => <Check className="h-5 w-5" />,
    },
    {
      title: "Pesanan",
      url: "/orders",
      icon: () => <MessageSquare className="h-5 w-5" />,
    },
    {
      title: "Arsip Pesanan",
      url: "/order-archive",
      icon: () => <ArchiveRestore className="h-5 w-5" />,
    },
    {
      title: "Pelanggan",
      url: "/customers",
      icon: () => <Users className="h-5 w-5" />,
    },
    {
      title: "Status Tracking",
      url: "/tracking",
      icon: () => <Clock className="h-5 w-5" />,
    },
    {
      title: "Notifikasi",
      url: "/notifications",
      icon: () => <Bell className="h-5 w-5" />,
      isPremiumFeature: true,
      featureName: "notifications",
    },
    {
      title: "Kasir (POS)",
      url: "/pos",
      icon: () => <ShoppingCart className="h-5 w-5" />,
    },
    {
      title: "Inventaris",
      url: "/inventory",
      icon: () => <Package className="h-5 w-5" />,
    },
    {
      title: "Rak Penyimpanan",
      url: "/racks",
      icon: () => <Archive className="h-5 w-5" />,
      isPremiumFeature: true,
      featureName: "racks",
    },
    {
      title: "Laporan Keuangan",
      url: "/reports",
      icon: () => <BarChart3 className="h-5 w-5" />,
    },
    {
      title: "Diskusi",
      url: "/discussion",
      icon: () => <MessagesSquare className="h-5 w-5" />,
      isPremiumFeature: true,
      featureName: "discussion",
    },
    {
      title: "Pengaturan Profil",
      url: "/profile-settings",
      icon: () => <UserCog className="h-5 w-5" />,
    },
  ];

  return (
    <Sidebar className="hidden md:block">
      <SidebarHeader className="p-4 flex items-center">
        <div className="flex-1 flex flex-col items-center md:items-start">
          {tenant?.logo ? (
            <img 
              src={tenant.logo} 
              alt={tenant.businessName} 
              className="h-10 mb-2"
            />
          ) : (
            <div className="text-xl font-bold text-laundry-primary">
              <span>Laundry</span>
              <span className="text-laundry-accent">Pro</span>
            </div>
          )}
          <div className="text-sm font-medium text-muted-foreground">
            {tenant?.businessName || "Demo Tenant"}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter(item => {
                  if (item.isPremiumFeature) {
                    return tenantStatus === "premium" || canAccessFeature(item.featureName, tenantStatus, featureSettings);
                  }
                  return true;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url}
                        className={({ isActive }) => 
                          isActive ? "text-laundry-primary" : "text-foreground"
                        }
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 text-xs text-center text-muted-foreground">
        <p>Abdul - Laundrypro &copy; 2025</p>
        <p>Platform Manajemen Laundry</p>
      </SidebarFooter>
    </Sidebar>
  );
}
