import { useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TenantContext } from "@/contexts/TenantContext";
import { MessageSquare, LogOut, Bell, Mail, Phone } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppHeader() {
  const { tenant } = useContext(TenantContext);
  const { signOut, user, profile } = useAuth();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [devNotifs, setDevNotifs] = useState([]);
  const [unread, setUnread] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [supportContact, setSupportContact] = useState({
    name: "Support Team",
    phone: "6287770834268",
    email: "laundrypro@owner.com"
  });

  useEffect(() => {
    const fetchDevNotifs = async () => {
      const { data, error } = await supabase
        .from("developer_notifications")
        .select("id, title, message, created_at, action_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setDevNotifs(data);
        // Cek status baca di localStorage
        const readIds = JSON.parse(localStorage.getItem("dev_notif_read_ids") || "[]");
        const hasUnread = data.some((n) => !readIds.includes(n.id));
        setUnread(hasUnread);
      }
    };
    fetchDevNotifs();
    
    // Fetch support contact information
    const fetchSupportContact = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, id")
        .eq("role", "superadmin")
        .limit(1);
      
      if (!error && data && data.length > 0) {
        const adminProfile = data[0];
        
        // Get email from auth.users
        const { data: userData, error: userError } = await supabase
          .from("auth_user_emails")
          .select("email")
          .eq("user_id", adminProfile.id)
          .limit(1);
          
        if (!userError && userData && userData.length > 0) {
          setSupportContact({
            name: `${adminProfile.first_name} ${adminProfile.last_name}`.trim(),
            phone: adminProfile.phone || "6287770834268",
            email: userData[0].email || "laundrypro@owner.com"
          });
        } else {
          // Fallback to default email if query fails
          setSupportContact(prev => ({
            ...prev,
            name: `${adminProfile.first_name} ${adminProfile.last_name}`.trim(),
            phone: adminProfile.phone || "6287770834268"
          }));
        }
      }
    };
    
    fetchSupportContact();
  }, []);  

  const handleMarkAllRead = () => {
    const ids = devNotifs.map((n) => n.id);
    localStorage.setItem("dev_notif_read_ids", JSON.stringify(ids));
    setUnread(false);
  };

  const handleNotifClick = (notif: any) => {
    // Tandai sudah dibaca
    const readIds = JSON.parse(localStorage.getItem("dev_notif_read_ids") || "[]");
    if (!readIds.includes(notif.id)) {
      const newIds = [...readIds, notif.id];
      localStorage.setItem("dev_notif_read_ids", JSON.stringify(newIds));
      setUnread(devNotifs.some((n) => !newIds.includes(n.id)));
    }
    // Jika ada action_url, redirect
    if (notif.action_url) {
      if (notif.action_url.startsWith("http")) {
        window.open(notif.action_url, "_blank");
      } else {
        window.location.href = notif.action_url;
      }
      setNotifOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast({ title: "Logged out successfully" });
      setPopoverOpen(false);
    } catch (error) {
      toast({ title: "Error logging out", variant: "destructive" });
    }
  };
  
  return (
    <header className="border-b bg-white sticky top-0 z-20">
      <div className="flex h-12 sm:h-16 items-center px-2 sm:px-4">
        <SidebarTrigger />
        
        <div className="flex-1 ml-2 sm:ml-4">
          <h2 className="text-base sm:text-lg font-semibold truncate">
            {tenant?.businessName || "LaundryPro"}
          </h2>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden sm:flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setHelpDialogOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              <span>Bantuan</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </Button>
          </div>
          <div className="sm:hidden flex items-center space-x-2">
            {/* Help button for mobile */}
            <button 
              className="h-8 w-8 rounded-full grid place-items-center hover:bg-gray-100 focus:outline-none"
              onClick={() => setHelpDialogOpen(true)}
            >
              <MessageSquare className="h-5 w-5 text-laundry-primary" />
            </button>
            
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="h-8 w-8 rounded-full focus:outline-none overflow-hidden">
                  <Avatar className="h-full w-full">
                    {profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.first_name || user?.email} />
                    ) : null}
                    <AvatarFallback className="bg-laundry-primary text-white text-base font-bold">
                      {profile?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "LP"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-32 p-0">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-b focus:outline-none"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </PopoverContent>
            </Popover>
          </div>
          <div className="hidden sm:block h-8 w-8 rounded-full overflow-hidden">
            <Avatar className="h-full w-full">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt={profile.first_name || user?.email} />
              ) : null}
              <AvatarFallback className="bg-laundry-primary text-white text-base font-bold">
                {profile?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "LP"}
              </AvatarFallback>
            </Avatar>
          </div>
          {/* Notifikasi developer */}
          <Popover open={notifOpen} onOpenChange={setNotifOpen}>
            <PopoverTrigger asChild>
              <button className="relative h-8 w-8 rounded-full grid place-items-center hover:bg-gray-100 focus:outline-none">
                <Bell className="h-5 w-5 text-laundry-primary" />
                {unread && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 max-w-xs p-0">
              <div className="p-3 border-b font-semibold flex justify-between items-center">
                Notifikasi
                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Tandai sudah dibaca</button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y">
                {devNotifs.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">Tidak ada notifikasi</div>
                ) : (
                  devNotifs.map((notif) => {
                    const readIds = JSON.parse(localStorage.getItem("dev_notif_read_ids") || "[]");
                    const isRead = readIds.includes(notif.id);
                    return (
                      <div
                        key={notif.id}
                        className={`p-3 cursor-pointer ${!isRead ? "bg-blue-50" : ""}`}
                        onClick={() => handleNotifClick(notif)}
                      >
                        <div className="font-medium text-sm mb-1">{notif.title}</div>
                        <div className="text-xs text-muted-foreground mb-1">{notif.message}</div>
                        <div className="text-[10px] text-gray-400">{new Date(notif.created_at).toLocaleString("id-ID")}</div>
                        {notif.action_url && (
                          <div className="text-[10px] text-blue-600 break-all mt-1">Aksi: {notif.action_url}</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Help Dialog */}
      <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold text-gray-800">Bantuan & Dukungan</DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Hubungi tim dukungan kami jika Anda membutuhkan bantuan
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-2">Tim Dukungan</h3>
              <p className="text-sm text-blue-700 mb-4">
                Kami siap membantu Anda dengan pertanyaan atau masalah teknis yang Anda alami.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-600 mr-2">{supportContact.phone}</p>
                      <a 
                        href={`https://wa.me/${supportContact.phone}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded"
                      >
                        Chat
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <div className="flex items-center mt-1">
                      <p className="text-sm text-gray-600 mr-2">{supportContact.email}</p>
                      <a 
                        href={`mailto:${supportContact.email}`} 
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Kirim
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="font-medium text-gray-800 mb-2">Jam Operasional</h3>
              <p className="text-sm text-gray-600">
                Senin - Jumat: 09:00 - 17:00 WIB<br />
                Sabtu: 09:00 - 15:00 WIB<br />
                Minggu & Hari Libur: Tutup
              </p>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-center">
            <Button 
              variant="outline" 
              onClick={() => setHelpDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
