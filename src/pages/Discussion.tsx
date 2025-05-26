import React, { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Search, Send, Plus, ArrowLeft, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useFeature } from "@/hooks/useFeature";
import { TenantContext } from "@/contexts/TenantContext";

interface Thread {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  business: {
    name: string;
  };
  user: {
    email: string;
    user_metadata: {
      full_name: string;
    };
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
  replies_count: number;
}

interface Reply {
  id: string;
  content: string;
  created_at: string;
  thread_id: string;
  user_id: string;
  business: {
    name: string;
  };
  user: {
    email: string;
    user_metadata: {
      full_name: string;
    };
  };
  profiles?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

const Discussion = () => {
  const { session, businessId } = useAuth();
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportType, setReportType] = useState<'thread' | 'reply'>('thread');
  const [reportedItemId, setReportedItemId] = useState<string>('');
  const [reportReason, setReportReason] = useState('');
  const navigate = useNavigate();
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";
  // Menggunakan hook useFeature untuk fitur diskusi
  const { hasAccess: canAccessDiscussion, loading: discussionFeatureLoading } = useFeature("discussion");

  // Tambahkan di awal komponen Discussion
  const checkUserBanned = async () => {
    try {
      // Gunakan format query tanpa single() untuk menghindari error ketika tidak ada data
      const { data: bannedDataList, error } = await supabase
        .from('discussion_banned_users')
        .select('*')
        .eq('user_id', session?.user?.id)
        .eq('is_active', true);

      if (error) {
        // Tidak perlu log error untuk mengurangi noise di console
        return false;
      }

      // Periksa apakah ada data banned
      if (bannedDataList && bannedDataList.length > 0) {
        const bannedData = bannedDataList[0];
        if (bannedData.banned_until) {
          const bannedUntil = new Date(bannedData.banned_until);
          const now = new Date();
          
          if (bannedUntil > now) {
            toast({
              title: "Akses Dibatasi",
              description: `Anda tidak dapat mengakses forum diskusi sampai ${new Date(bannedData.banned_until).toLocaleDateString('id-ID')}`,
              variant: "destructive",
            });
            navigate('/');
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      // Tidak perlu log error di sini untuk mengurangi noise di console
      return false;
    }
  };

  useEffect(() => {
    // Hanya redirect jika loading selesai dan pengguna benar-benar tidak memiliki akses
    // Ini mencegah redirect prematur saat data masih dimuat
    if (!discussionFeatureLoading && canAccessDiscussion === false) {
      navigate('/');
      return;
    }
    
    // Jika pengguna memiliki akses atau masih loading, periksa status banned
    if (canAccessDiscussion || discussionFeatureLoading) {
      const checkBan = async () => {
        await checkUserBanned();
      };
      
      checkBan();
    }
  }, [canAccessDiscussion, discussionFeatureLoading, navigate]);

  // Fetch threads tanpa filter business_id
  const fetchThreads = async () => {
    try {
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(`
          *,
          business:business_id (
            name
          ),
          profiles:user_id (
            first_name,
            last_name
          ),
          replies:discussion_replies (count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const transformedData = data?.map(thread => ({
        ...thread,
        business: {
          name: thread.business?.name || "Unknown Business"
        },
        user: {
          email: "",
          user_metadata: {
            full_name: `${thread.profiles?.first_name || ""} ${thread.profiles?.last_name || ""}`.trim() || "Unknown"
          }
        },
        replies_count: thread.replies?.[0]?.count || 0
      })) || [];
      
      setThreads(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat diskusi",
        variant: "destructive",
      });
      console.error("Error fetching threads:", error);
    }
  };

  // Fetch replies for selected thread
  const fetchReplies = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .select(`
          *,
          businesses!business_id (
            name
          ),
          profiles:user_id (
            first_name,
            last_name
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData = data?.map(reply => ({
        ...reply,
        business: {
          name: reply.businesses && typeof reply.businesses === 'object' ? (reply.businesses as any).name || "Unknown Business" : "Unknown Business"
        },
        user: {
          email: "",
          user_metadata: {
            full_name: `${reply.profiles?.first_name || ""} ${reply.profiles?.last_name || ""}`.trim() || "Unknown"
          }
        }
      })) || [];

      setReplies(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal memuat balasan",
        variant: "destructive",
      });
      console.error("Error fetching replies:", error);
    }
  };

  // Create new thread
  const createThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      toast({
        title: "Error",
        description: "Judul dan konten harus diisi",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("discussion_threads")
        .insert({
          title: newThreadTitle,
          content: newThreadContent,
          user_id: session?.user.id,
          business_id: businessId,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Diskusi berhasil dibuat",
      });

      setNewThreadTitle("");
      setNewThreadContent("");
      fetchThreads();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal membuat diskusi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create new reply
  const createReply = async () => {
    if (!newReply.trim() || !selectedThread) {
      toast({
        title: "Error",
        description: "Balasan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("discussion_replies").insert({
        content: newReply,
        thread_id: selectedThread.id,
        user_id: session?.user.id,
        business_id: businessId,
      });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Balasan berhasil dikirim",
      });

      setNewReply("");
      fetchReplies(selectedThread.id);
      fetchThreads(); // Refresh thread list to update reply count
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Gagal mengirim balasan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk mendapatkan reported_user_id berdasarkan type dan item_id
  const getReportedUserId = async (type: 'thread' | 'reply', itemId: string) => {
    try {
      if (type === 'thread') {
        const { data } = await supabase
          .from('discussion_threads')
          .select('user_id')
          .eq('id', itemId)
          .single();
        return data?.user_id;
      } else {
        const { data } = await supabase
          .from('discussion_replies')
          .select('user_id')
          .eq('id', itemId)
          .single();
        return data?.user_id;
      }
    } catch (error) {
      console.error('Error getting reported user:', error);
      return null;
    }
  };

  // Update fungsi handleReport
  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "Error",
        description: "Alasan laporan harus diisi",
        variant: "destructive",
      });
      return;
    }

    if (!session?.user?.id) {
      toast({
        title: "Error",
        description: "Silakan login terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Dapatkan user_id yang dilaporkan
      const reportedUserId = await getReportedUserId(reportType, reportedItemId);
      
      if (!reportedUserId) {
        throw new Error('Tidak dapat menemukan user yang dilaporkan');
      }

      // Cek apakah user melaporkan dirinya sendiri
      if (reportedUserId === session.user.id) {
        toast({
          title: "Error",
          description: "Anda tidak dapat melaporkan diri sendiri",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('discussion_reports')
        .insert({
          type: reportType,
          item_id: reportedItemId,
          reason: reportReason,
          reporter_id: session.user.id,
          reported_user_id: reportedUserId,
          business_id: businessId,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Laporan telah dikirim dan akan ditinjau oleh admin",
      });
      
      setIsReportDialogOpen(false);
      setReportReason('');
      setReportedItemId('');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: error.message || "Gagal mengirim laporan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();

    // Subscribe to ALL changes in discussion_threads
    const threadsSubscription = supabase
      .channel('public:discussion_threads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_threads'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch complete thread data including relations
            const { data: newThreadData } = await supabase
              .from("discussion_threads")
              .select(`
                *,
                businesses!business_id (
                  name
                ),
                profiles:user_id (
                  first_name,
                  last_name,
                  avatar_url
                ),
                replies:discussion_replies (count)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newThreadData) {
              const transformedThread = {
                ...newThreadData,
                business: {
                  name: newThreadData.businesses?.name || "Unknown Business"
                },
                user: {
                  email: "",
                  user_metadata: {
                    full_name: `${newThreadData.profiles?.first_name || ""} ${newThreadData.profiles?.last_name || ""}`.trim() || "Unknown"
                  }
                },
                replies_count: newThreadData.replies?.[0]?.count || 0
              };
              setThreads(prev => [transformedThread, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Update existing thread
            fetchThreads();
          } else if (payload.eventType === 'DELETE') {
            setThreads(prev => prev.filter(thread => thread.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      threadsSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedThread) {
      fetchReplies(selectedThread.id);

      // Subscribe to ALL changes in discussion_replies for the selected thread
      const repliesSubscription = supabase
        .channel(`public:discussion_replies:thread_id=eq.${selectedThread.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'discussion_replies',
            filter: `thread_id=eq.${selectedThread.id}`
          },
          async (payload) => {
            if (payload.eventType === 'INSERT') {
              const { data: newReplyData } = await supabase
                .from("discussion_replies")
                .select(`
                  *,
                  businesses!business_id (
                    name
                  ),
                  profiles:user_id (
                    first_name,
                    last_name,
                    avatar_url
                  )
                `)
                .eq('id', payload.new.id)
                .single();
              if (newReplyData) {
                const transformedReply = {
                  ...newReplyData,
                  business: {
                    name: newReplyData.businesses && typeof newReplyData.businesses === 'object' ? (newReplyData.businesses as any).name || "Unknown Business" : "Unknown Business"
                  },
                  user: {
                    email: "",
                    user_metadata: {
                      full_name: `${newReplyData.profiles?.first_name || ""} ${newReplyData.profiles?.last_name || ""}`.trim() || "Unknown"
                    },
                    avatar_url: newReplyData.profiles?.avatar_url
                  }
                };
                setReplies(prev => [...prev, transformedReply]);
                
                // Update thread reply count
                setThreads(prev => 
                  prev.map(thread => 
                    thread.id === selectedThread.id 
                      ? { ...thread, replies_count: thread.replies_count + 1 }
                      : thread
                  )
                );
              }
            } else if (payload.eventType === 'UPDATE') {
              fetchReplies(selectedThread.id);
            } else if (payload.eventType === 'DELETE') {
              setReplies(prev => prev.filter(reply => reply.id !== payload.old.id));
              
              // Update thread reply count
              setThreads(prev => 
                prev.map(thread => 
                  thread.id === selectedThread.id 
                    ? { ...thread, replies_count: Math.max(0, thread.replies_count - 1) }
                    : thread
                )
              );
            }
          }
        )
        .subscribe();

      return () => {
        repliesSubscription.unsubscribe();
      };
    }
  }, [selectedThread]);

  // Filter threads based on search query
  const filteredThreads = threads.filter(thread =>
    thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thread.business.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container py-6 max-w-4xl mx-auto">
      {/* Tidak perlu modal akses ditolak di sini, sudah ada di Dashboard */}
      {
        <Card className="rounded-xl shadow-md border-0 bg-white">
          <div className="flex flex-col h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-medium text-gray-600">Forum Diskusi Laundry</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPolicyDialogOpen(true)}
                  className="h-6 text-xs px-2 text-gray-500 hover:text-gray-700"
                >
                  Peraturan
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewThreadDialogOpen(true)}
                className="h-8 text-xs px-2"
              >
                Topik Baru
              </Button>
            </div>

            <div className="relative px-4 py-2">
              <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari diskusi atau nama usaha..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <ScrollArea className="flex-1 px-4">
              <div className="space-y-3 py-2">
                {filteredThreads.map((thread) => (
                  <div
                    key={thread.id}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/discussion/${thread.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-8 w-8 shrink-0">
                          {thread.profiles?.avatar_url ? (
                            <AvatarImage src={thread.profiles.avatar_url} alt={thread.user?.user_metadata?.full_name} />
                          ) : null}
                          <AvatarFallback>
                            {thread.profiles?.first_name?.[0]?.toUpperCase() || thread.user?.user_metadata?.full_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{thread.title}</h3>
                          <p className="text-sm text-gray-500 truncate">
                            {thread.user?.user_metadata?.full_name} • {thread.business.name}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                            <span>
                              {formatDistanceToNow(new Date(thread.created_at), {
                                addSuffix: true,
                                locale: id,
                              })}
                            </span>
                            <span>{thread.replies_count} balasan</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportType('thread');
                          setReportedItemId(thread.id);
                          setIsReportDialogOpen(true);
                        }}
                        className="h-6 text-xs px-2 text-gray-500 hover:text-gray-700"
                      >
                        Laporkan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </Card>
      }

      {/* Modal Buat Topik Baru */}
      <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium">Buat Diskusi Baru</DialogTitle>
            <DialogDescription className="text-sm">
              Buat topik diskusi baru untuk didiskusikan dengan komunitas laundry
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Judul diskusi"
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
            />
            <Textarea
              placeholder="Isi diskusi"
              value={newThreadContent}
              onChange={(e) => setNewThreadContent(e.target.value)}
              rows={4}
            />
            <Button
              onClick={() => {
                createThread();
                setIsNewThreadDialogOpen(false);
              }}
              disabled={isLoading}
              className="w-full"
            >
              Buat Diskusi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Peraturan Forum */}
      <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium">Peraturan Forum</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px] p-4">
            <div className="space-y-4">
              <h3 className="font-semibold">1. Etika Berkomunikasi</h3>
              <p>• Gunakan bahasa yang sopan dan hormat</p>
              <p>• Dilarang menggunakan kata-kata kasar atau SARA</p>
              <p>• Hormati pendapat orang lain</p>

              <h3 className="font-semibold">2. Konten Diskusi</h3>
              <p>• Pastikan topik relevan dengan industri laundry</p>
              <p>• Dilarang memposting konten dewasa atau ilegal</p>
              <p>• Hindari spam dan promosi berlebihan</p>

              <h3 className="font-semibold">3. Privasi</h3>
              <p>• Jaga kerahasiaan data pribadi</p>
              <p>• Tidak membagikan informasi sensitif</p>

              <h3 className="font-semibold">4. Sanksi</h3>
              <p>• Pelanggaran dapat berakibat peringatan</p>
              <p>• Pelanggaran berulang dapat berakibat pemblokiran akun</p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog Report */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-medium">
              Laporkan {reportType === 'thread' ? 'Diskusi' : 'Balasan'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Mohon berikan alasan pelaporan dengan jelas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Alasan pelaporan..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleReport}
              disabled={isLoading}
              className="w-full"
            >
              Kirim Laporan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discussion; 