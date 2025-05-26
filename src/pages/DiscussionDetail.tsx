import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, Send, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

const DiscussionDetail: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { session, businessId } = useAuth();
  const { toast } = useToast();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // State untuk modal report
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportType, setReportType] = useState<"thread" | "reply">("thread");
  const [reportItemId, setReportItemId] = useState("");
  
  // Menggunakan hook useFeature untuk fitur diskusi
  const { hasAccess: canAccessDiscussion, loading: discussionFeatureLoading } = useFeature("discussion");
  const { tenant } = useContext(TenantContext);
  const tenantStatus = tenant?.status || "free";

  // Cek akses fitur diskusi
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
  
  // Efek terpisah untuk fetch data
  useEffect(() => {
    if (canAccessDiscussion) {
      fetchThread();
      fetchReplies();
    }
  }, [threadId]);
  
  // Fungsi untuk memeriksa apakah pengguna di-banned
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
  
  // Fetch thread detail
  const fetchThread = async () => {
    if (!threadId) return;
    
    try {
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(`
          *,
          business:business_id (name),
          profiles:user_id (first_name, last_name, avatar_url)
        `)
        .eq("id", threadId)
        .single();

      if (error) throw error;

      setThread({
        ...data,
        business: {
          name: data.business?.name || "Unknown Business"
        },
        user: {
          email: "",
          user_metadata: {
            full_name: `${data.profiles?.first_name || ""} ${data.profiles?.last_name || ""}`.trim() || "Unknown"
          }
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat detail diskusi",
        variant: "destructive",
      });
    }
  };

  // Fetch replies
  const fetchReplies = async () => {
    if (!threadId) return;

    try {
      const { data, error } = await supabase
        .from("discussion_replies")
        .select(`
          *,
          business:business_id (name),
          profiles:user_id (first_name, last_name, avatar_url)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const transformedData = data?.map(reply => ({
        ...reply,
        business: {
          name: reply.business?.name || "Unknown Business"
        },
        user: {
          email: "",
          user_metadata: {
            full_name: `${reply.profiles?.first_name || ""} ${reply.profiles?.last_name || ""}`.trim() || "Unknown"
          }
        }
      })) || [];

      // Bandingkan dengan replies yang sudah ada untuk menghindari duplicate
      setReplies(current => {
        const newReplies = transformedData.filter(
          newReply => !current.some(existingReply => existingReply.id === newReply.id)
        );
        
        if (newReplies.length > 0) {
          return [...current, ...newReplies];
        }
        
        return current;
      });

    } catch (error) {
      console.error('❌ Error fetching replies:', error);
      toast({
        title: "Error",
        description: "Gagal memuat balasan",
        variant: "destructive",
      });
    }
  };

  // Create reply
  const createReply = async () => {
    if (!newReply.trim() || !threadId || !session?.user.id) {
      toast({
        title: "Error",
        description: "Balasan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("discussion_replies")
        .insert({
          content: newReply,
          thread_id: threadId,
          user_id: session.user.id,
          business_id: businessId,
        });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Balasan berhasil dikirim",
      });

      setNewReply("");
      fetchReplies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengirim balasan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi untuk menangani report
  const handleReport = async () => {
    if (!reportReason.trim() || !session?.user.id) {
      toast({
        title: "Error",
        description: "Alasan laporan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    try {
      const reportedItem = reportType === "thread" ? thread : replies.find(r => r.id === reportItemId);
      if (!reportedItem) {
        throw new Error("Item yang dilaporkan tidak ditemukan");
      }

      const { error } = await supabase
        .from("discussion_reports")
        .insert({
          type: reportType,
          item_id: reportItemId,
          reason: reportReason,
          reporter_id: session.user.id,
          reported_user_id: reportedItem.user_id,
          business_id: businessId,
          status: "pending"
        });

      if (error) throw error;

      toast({
        title: "Sukses",
        description: "Laporan berhasil dikirim",
      });

      setShowReportModal(false);
      setReportReason("");
    } catch (error) {
      console.error("Error reporting:", error);
      toast({
        title: "Error",
        description: "Gagal mengirim laporan",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk membuka modal report
  const openReportModal = (type: "thread" | "reply", itemId: string) => {
    setReportType(type);
    setReportItemId(itemId);
    setShowReportModal(true);
  };

  useEffect(() => {
    if (!threadId) return;
    
    fetchThread();
    fetchReplies();

    // Subscribe to thread changes
    const threadSubscription = supabase
      .channel('public:discussion_threads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_threads',
          filter: `id=eq.${threadId}`
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            fetchThread();
          }
        }
      )
      .subscribe();

    // Subscribe to replies changes
    const repliesSubscription = supabase
      .channel('public:discussion_replies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'discussion_replies',
          filter: `thread_id=eq.${threadId}`
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchReplies();
          }
        }
      )
      .subscribe();

    return () => {
      threadSubscription.unsubscribe();
      repliesSubscription.unsubscribe();
    };
  }, [threadId]);

  // Tambahkan useEffect untuk auto-scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [replies]); // Scroll setiap kali replies berubah

  if (!thread) {
    return <div className="container mx-auto p-4">Memuat...</div>;
  }

  return (
    <div className="space-y-6 pb-8 max-w-screen-sm mx-auto px-2 overflow-x-hidden w-full">
      {/* Tidak perlu modal akses ditolak di sini, sudah ada di Dashboard */}
      <Card className="rounded-xl shadow-md border-0 bg-white">
        <div className="flex flex-col h-[calc(100vh-2rem)]">
          {/* Header */}
          <div className="flex items-center gap-2 p-3 border-b">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-2 h-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-medium text-gray-600 truncate">{thread.title}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {thread.user?.user_metadata?.full_name} • {thread.business.name}
              </p>
            </div>
          </div>

          {/* Chat Area */}
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="space-y-3 p-3">
              {/* Thread Content */}
              <div className="flex gap-2">
                <Avatar className="h-8 w-8 shrink-0">
                  {thread.profiles?.avatar_url ? (
                    <AvatarImage src={thread.profiles.avatar_url} alt={thread.user?.user_metadata?.full_name} />
                  ) : null}
                  <AvatarFallback>
                    {thread.profiles?.first_name?.[0]?.toUpperCase() || thread.user?.user_metadata?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-100 rounded-lg p-2">
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {thread.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(thread.created_at), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-muted-foreground hover:text-red-600"
                      onClick={() => openReportModal("thread", thread.id)}
                    >
                      <Flag className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 mt-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    {reply.profiles?.avatar_url ? (
                      <AvatarImage src={reply.profiles.avatar_url} alt={reply.user?.user_metadata?.full_name} />
                    ) : null}
                    <AvatarFallback>
                      {reply.profiles?.first_name?.[0]?.toUpperCase() || reply.user?.user_metadata?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {reply.content}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), {
                          addSuffix: true,
                          locale: id,
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-muted-foreground hover:text-red-600"
                        onClick={() => openReportModal("reply", reply.id)}
                      >
                        <Flag className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Tulis balasan..."
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    createReply();
                  }
                }}
                className="flex-1 h-9"
              />
              <Button
                onClick={createReply}
                disabled={isLoading || !newReply.trim()}
                size="sm"
                className="h-9 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal Report */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laporkan {reportType === "thread" ? "Topik" : "Balasan"}</DialogTitle>
            <DialogDescription>
              Berikan alasan mengapa konten ini perlu dilaporkan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Alasan pelaporan..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReportModal(false);
                setReportReason("");
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={!reportReason.trim()}
            >
              Laporkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiscussionDetail;