import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

type Tables = Database['public']['Tables']
type Report = Tables['discussion_reports']['Row'] & {
  reporter: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reported_user: {
    id: string;
    first_name: string;
    last_name: string;
  };
  business: {
    id: string;
    name: string;
  };
  thread?: {
    id: string;
    title: string;
    content: string;
  };
  reply?: {
    id: string;
    content: string;
  };
}

type UserProfile = {
  first_name: string;
  last_name: string;
}

type BusinessInfo = {
  name: string;
}

type BannedUser = Tables['discussion_banned_users']['Row'] & {
  user: UserProfile;
  business: BusinessInfo;
  banned_by_user?: UserProfile;
}

const PlatformAdminReports = () => {
  const { session } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [banDuration, setBanDuration] = useState("1"); // dalam hari
  const [banReason, setBanReason] = useState("");
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'ban' | 'delete_thread' | 'ignore';
    report: Report | null;
  }>({ type: 'ban', report: null });

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          // Auth error handling
          return;
        }
        
        if (!user) {
          toast({
            title: "Error",
            description: "Silakan login terlebih dahulu",
            variant: "destructive"
          });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Profile error handling
          return;
        }

        if (profile?.role !== 'platform_admin' && profile?.role !== 'superadmin') {
          toast({
            title: "Akses Ditolak",
            description: "Anda tidak memiliki akses ke halaman ini",
            variant: "destructive"
          });
          return;
        }

        await fetchReports();
        await fetchBannedUsers();
        
      } catch (error) {
        // Error in checkUserRole handling
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memeriksa role user",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data: reportData, error: reportError } = await supabase
        .from('discussion_reports')
        .select(`
          *,
          reporter:profiles!reporter_id (id, first_name, last_name),
          reported_user:profiles!reported_user_id (id, first_name, last_name),
          business:businesses!business_id (id, name)
        `)
        .eq('status', 'pending') // Hanya tampilkan laporan yang belum ditindaklanjuti
        .order('created_at', { ascending: false });

      if (reportError) throw reportError;

      // Ambil detail thread dan reply untuk setiap report
      const reportsWithContent = await Promise.all((reportData || []).map(async (report) => {
        if (report.type === 'thread') {
          const { data: threadData } = await supabase
            .from('discussion_threads')
            .select('id, title, content')
            .eq('id', report.item_id)
            .single();
          return { ...report, thread: threadData } as Report;
        } else {
          const { data: replyData } = await supabase
            .from('discussion_replies')
            .select('id, content')
            .eq('id', report.item_id)
            .single();
          return { ...report, reply: replyData } as Report;
        }
      }));

      setReports(reportsWithContent);
    } catch (error) {
      // Error fetching reports handling
      toast({
        title: "Error",
        description: "Gagal memuat data laporan",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBannedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('discussion_banned_users')
        .select(`
          *,
          user:profiles!user_id (first_name, last_name),
          business:businesses!business_id (name),
          banned_by_user:profiles!banned_by (first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBannedUsers(data || []);
    } catch (error) {
      // Error fetching banned users handling
      toast({
        title: "Error",
        description: "Gagal memuat data user yang dibanned",
        variant: "destructive"
      });
    }
  };

  const handleBanUser = async (report: Report) => {
    if (!banDuration || !banReason || !session?.user?.id) return;

    try {
      const bannedUntil = new Date();
      bannedUntil.setDate(bannedUntil.getDate() + parseInt(banDuration));

      // Tambahkan user ke daftar banned
      const { error: banError } = await supabase
        .from('discussion_banned_users')
        .insert({
          user_id: report.reported_user.id,
          business_id: report.business_id,
          reason: banReason,
          banned_until: bannedUntil.toISOString(),
          banned_by: session.user.id,
          is_active: true,
          created_at: new Date().toISOString()
        });

      if (banError) throw banError;

      // Jika yang dilaporkan adalah thread, hapus threadnya
      if (report.type === 'thread') {
        try {
          // Hapus thread langsung dari database
          const { error: deleteError } = await supabase
            .from('discussion_threads')
            .delete()
            .eq('id', report.item_id);
            
          if (deleteError) {
            throw deleteError;
          }
          
          // Verifikasi apakah thread benar-benar terhapus
          const { data: checkThread } = await supabase
            .from('discussion_threads')
            .select('id')
            .eq('id', report.item_id)
            .single();
            
          if (checkThread) {
            // Log pesan error untuk debugging
            toast({
              title: "Peringatan",
              description: "Thread tidak terhapus, tetapi user sudah dibanned. Silakan coba lagi.",
              variant: "destructive"
            });
          } else {
            // Hapus juga semua balasan yang terkait dengan thread ini
            const { error: deleteRepliesError } = await supabase
              .from('discussion_replies')
              .delete()
              .eq('thread_id', report.item_id);
          }
        } catch (err) {
          toast({
            title: "Error",
            description: "Gagal menghapus thread, tetapi user sudah dibanned",
            variant: "destructive"
          });
        }
      }

      // Hapus laporan dari database setelah ditindaklanjuti
      const { error: deleteError } = await supabase
        .from('discussion_reports')
        .delete()
        .eq('id', report.id);
        
      if (deleteError) {
        // Jika gagal menghapus, update status saja
        await supabase
          .from('discussion_reports')
          .update({ 
            status: 'resolved',
            action_taken: 'banned',
            action_notes: `${report.type === 'thread' ? 'Thread dihapus dan user dibanned' : 'User dibanned'} selama ${banDuration} hari: ${banReason}`,
            reviewed_at: new Date().toISOString(),
            reviewed_by: session?.user?.id
          })
          .eq('id', report.id);
      }

      toast({
        title: "Sukses",
        description: "Tindakan berhasil dilakukan",
      });

      // Hapus laporan dari state lokal
      setReports(prev => prev.filter(r => r.id !== report.id));

      // Refresh data
      fetchReports();
      fetchBannedUsers();
      setSelectedReport(null);
      setBanReason("");
      setBanDuration("1");
    } catch (error) {
      // Error taking action handling
      toast({
        title: "Error",
        description: "Gagal melakukan tindakan",
        variant: "destructive"
      });
    }
  };

  const handleIgnoreReport = async (report: Report) => {
    try {
      // Coba hapus langsung dari database dengan kebijakan RLS yang baru
      const { error: deleteError } = await supabase
        .from('discussion_reports')
        .delete()
        .eq('id', report.id);

      if (deleteError) {
        // Jika masih gagal menghapus, update status saja
        await supabase
          .from('discussion_reports')
          .update({ 
            status: 'rejected',
            action_taken: 'ignored',
            action_notes: 'Laporan diabaikan oleh admin',
            reviewed_at: new Date().toISOString(),
            reviewed_by: session?.user?.id
          })
          .eq('id', report.id);
          
        // Tampilkan pesan bahwa laporan hanya diupdate, tidak dihapus
        toast({
          title: "Peringatan",
          description: "Laporan telah diabaikan tetapi tidak dapat dihapus dari database",
          variant: "warning"
        });
      } else {
        toast({
          title: "Sukses",
          description: "Laporan telah diabaikan dan dihapus dari database",
        });
      }

      // Hapus laporan dari state lokal
      setReports(prev => prev.filter(r => r.id !== report.id));
      
      // Refresh data laporan
      fetchReports();
    } catch (error) {
      // Error ignoring report handling
      toast({
        title: "Error",
        description: "Gagal mengabaikan laporan",
        variant: "destructive"
      });
    }
  };

  const handleUnbanUser = async (bannedUserId: string) => {
    try {
      const { error } = await supabase
        .from('discussion_banned_users')
        .update({ is_active: false })
        .eq('id', bannedUserId);

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "User berhasil diunban",
      });

      fetchBannedUsers();
    } catch (error) {
      // Error unbanning user handling
      toast({
        title: "Error",
        description: "Gagal melakukan unban user",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-muted-foreground">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-screen-md mx-auto px-4">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Laporan Diskusi</h2>
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada laporan yang perlu ditinjau</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">
                        Dilaporkan oleh: {report.reporter.first_name} {report.reporter.last_name}
                      </p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        report.type === 'thread' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {report.type === 'thread' ? 'Topik' : 'Balasan'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(report.created_at), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </p>
                    <p className="mt-2 text-gray-600">{report.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfirmAction({ type: 'ignore', report });
                        setShowConfirmDialog(true);
                      }}
                    >
                      Abaikan
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setConfirmAction({ type: report.type === 'thread' ? 'delete_thread' : 'ban', report });
                        setShowConfirmDialog(true);
                      }}
                    >
                      {report.type === 'thread' ? 'Hapus & Ban' : 'Ban User'}
                    </Button>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 p-3 rounded">
                  <p className="text-sm font-medium">Konten yang dilaporkan:</p>
                  <p className="text-sm mt-1">
                    {report.type === 'thread' 
                      ? report.thread?.title || 'Thread telah dihapus'
                      : report.reply?.content || 'Balasan telah dihapus'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Oleh: {report.reported_user.first_name} {report.reported_user.last_name} • {report.business.name}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Daftar User Dibanned</h2>
        <div className="space-y-4">
          {bannedUsers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Tidak ada user yang dibanned</p>
          ) : (
            bannedUsers.map((banned) => (
              <div key={banned.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {banned.user.first_name} {banned.user.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {banned.business.name} • Sampai: {new Date(banned.banned_until).toLocaleDateString('id-ID')}
                    </p>
                    <p className="mt-2">Alasan: {banned.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Dibanned oleh: {banned.banned_by_user?.first_name} {banned.banned_by_user?.last_name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnbanUser(banned.id)}
                  >
                    Unban
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Modal Konfirmasi */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmAction.type === 'ignore' 
                ? 'Abaikan Laporan' 
                : confirmAction.type === 'delete_thread'
                ? 'Hapus Topik & Ban User'
                : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction.type === 'ignore'
                ? 'Apakah Anda yakin ingin mengabaikan laporan ini?'
                : confirmAction.type === 'delete_thread'
                ? 'Tindakan ini akan menghapus topik diskusi dan mem-ban user. Apakah Anda yakin?'
                : 'Apakah Anda yakin ingin mem-ban user ini?'}
            </DialogDescription>
          </DialogHeader>
          
          {confirmAction.type !== 'ignore' && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Durasi Ban (hari)</label>
                <Input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alasan</label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Alasan pemberian ban"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmAction({ type: 'ban', report: null });
                setBanReason("");
                setBanDuration("1");
              }}
            >
              Batal
            </Button>
            <Button
              variant={confirmAction.type === 'ignore' ? 'outline' : 'destructive'}
              onClick={() => {
                if (confirmAction.report) {
                  if (confirmAction.type === 'ignore') {
                    handleIgnoreReport(confirmAction.report);
                  } else {
                    // Baik untuk aksi 'ban' maupun 'delete_thread', gunakan handleBanUser
                    // karena handleBanUser sudah menangani penghapusan thread jika tipe report adalah 'thread'
                    handleBanUser(confirmAction.report);
                  }
                }
                setShowConfirmDialog(false);
              }}
              disabled={confirmAction.type !== 'ignore' && (!banDuration || !banReason)}
            >
              {confirmAction.type === 'ignore' ? 'Abaikan' : 'Lanjutkan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformAdminReports; 