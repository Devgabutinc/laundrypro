import { useState, useEffect, useContext, useRef, SyntheticEvent } from "react";
import { Order, mockOrders, OrderStatus, orderStatusLabels } from "@/models/Order";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useFeature } from "@/hooks/useFeature";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { TenantContext } from "@/contexts/TenantContext";
import { generateWhatsAppMessage, getWhatsAppDeepLink } from "@/services/NotificationService";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle, DialogFooter as ConfirmDialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Bell, Edit, Trash, Plus, MessageSquare, Send, RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

// Interface for developer notifications
interface DeveloperNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  created_at: string;
  updated_at: string;
  target_audience: "all" | "premium" | "free";
  action_url?: string;
  action_text?: string;
  expires_at?: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useContext(TenantContext);
  const { toast } = useToast();
  const { hasAccess, loading: featureLoading } = useFeature("notifications");
  
  // Cek akses fitur notifikasi
  useEffect(() => {
    if (featureLoading) return;
    
    if (hasAccess === false) {
      toast({
        variant: "destructive",
        title: "Akses Ditolak",
        description: "Anda tidak memiliki akses ke fitur notifikasi",
      });
      navigate("/dashboard");
    }
  }, [hasAccess, featureLoading, navigate, toast]);

  // State for existing notification features
  const [customNotifications, setCustomNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState<string>("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [featureSettings, setFeatureSettings] = useState([]);
  const tenantStatus = tenant?.status || "free";
  // Menggunakan hook useFeature untuk fitur notifikasi
  const { hasAccess: canAccessNotifications, loading: notificationsFeatureLoading } = useFeature("notifications");
  // Cek apakah notifikasi WA boleh clean (tanpa watermark)
  const isWaNotifClean = tenantStatus === "premium" || (featureSettings.find(f => f.feature_name === "wa_notification_clean")?.is_free && tenantStatus === "free");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [notifToEdit, setNotifToEdit] = useState<any>(null);
  const [editModalMessage, setEditModalMessage] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEditTemplateModal, setShowEditTemplateModal] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<any>(null);
  const [editTemplateText, setEditTemplateText] = useState("");
  const [editTemplateName, setEditTemplateName] = useState("");
  
  // State for tabs
  const [activeTab, setActiveTab] = useState("customer");
  
  // State for developer notifications
  const [developerNotifications, setDeveloperNotifications] = useState<DeveloperNotification[]>([]);
  const [devNotifLoading, setDevNotifLoading] = useState(false);
  const [devNotifError, setDevNotifError] = useState<string | null>(null);
  const [showDevNotifModal, setShowDevNotifModal] = useState(false);
  const [devNotifToEdit, setDevNotifToEdit] = useState<DeveloperNotification | null>(null);
  const [showDevNotifDeleteModal, setShowDevNotifDeleteModal] = useState(false);
  const [devNotifToDelete, setDevNotifToDelete] = useState<DeveloperNotification | null>(null);
  
  // Form state for developer notifications
  const [devNotifTitle, setDevNotifTitle] = useState("");
  const [devNotifMessage, setDevNotifMessage] = useState("");
  const [devNotifType, setDevNotifType] = useState<"info" | "warning" | "error" | "success">("info");
  const [devNotifTargetAudience, setDevNotifTargetAudience] = useState<"all" | "premium" | "free">("all");
  const [devNotifActionUrl, setDevNotifActionUrl] = useState("");
  const [devNotifActionText, setDevNotifActionText] = useState("");
  const [devNotifExpiresAt, setDevNotifExpiresAt] = useState("");
  
  // Check if user is admin or superadmin
  const isAdmin = tenant?.role === "admin" || tenant?.role === "superadmin";
  const isSuperAdmin = tenant?.role === "superadmin";

  // Cek akses fitur notifikasi
  useEffect(() => {
    // Hanya redirect jika loading selesai dan pengguna benar-benar tidak memiliki akses
    // Ini mencegah redirect prematur saat data masih dimuat
    if (!notificationsFeatureLoading && canAccessNotifications === false) {
      navigate('/');
      return;
    }
  }, [canAccessNotifications, notificationsFeatureLoading, navigate]);

  // Load orders from Supabase
  useEffect(() => {
    const fetchOrders = async () => {
      if (!tenant?.id) return;
      setLoading(true);
      setError(null);
      try {
        // Ambil data orders dan join customer
        const { data, error } = await supabase
          .from("orders")
          .select(`*, customers:customer_id (id, name, phone)`)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        // Mapping ke tipe Order frontend
        const mapped: Order[] = (data || []).map((row: any) => ({
          id: row.id,
          customerId: row.customer_id,
          customerName: row.customers?.name || "-",
          customerPhone: row.customers?.phone || "-",
          items: [], // Untuk notifikasi, detail item tidak wajib
          status: row.status,
          createdAt: row.created_at ? new Date(row.created_at) : new Date(),
          updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
          statusHistory: [], // Bisa diisi jika ingin histori status
          notes: row.notes || undefined,
          totalPrice: row.total_price || 0,
        }));
        setOrders(mapped);
      } catch (err: any) {
        setError(err.message || "Gagal mengambil data pesanan");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [tenant?.id]);

  // Load custom notifications from Supabase
  useEffect(() => {
    const fetchCustomNotifications = async () => {
      if (!tenant?.id) return;
      setNotifLoading(true);
      setNotifError(null);
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("business_id", tenant.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setCustomNotifications(data || []);
      } catch (err: any) {
        setNotifError(err.message || "Gagal mengambil notifikasi custom");
      } finally {
        setNotifLoading(false);
      }
    };
    fetchCustomNotifications();
  }, [tenant?.id]);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!tenant?.id) return;
      setTemplateLoading(true);
      setTemplateError(null);
      try {
        const { data, error } = await supabase
          .from("notification_templates")
          .select("*")
          .eq("business_id", tenant.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setTemplates(data || []);
      } catch (err: any) {
        setTemplateError(err.message || "Gagal mengambil template");
      } finally {
        setTemplateLoading(false);
      }
    };
    fetchTemplates();
  }, [tenant?.id, showTemplateModal]);

  useEffect(() => {
    const fetchFeatureSettings = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await (supabase.from as any)("feature_settings")
        .select("feature_name, is_free, is_premium");
      if (!error && data) setFeatureSettings(data);
    };
    fetchFeatureSettings();
  }, [tenant?.id]);

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  // Helper untuk menyingkat UUID ke format ORD#xxxx (4 digit terakhir)
  const shortId = (id: string) => id ? `ORD#${id.substring(id.length - 4)}` : "-";

  // Helper substitusi variabel template
  const substituteTemplate = (tpl: string, order: any, tenant: any) => {
    const shortOrderId = order.id ? `ORD#${order.id.substring(order.id.length - 4)}` : "-";
    const statusLabel = orderStatusLabels[order.status] || order.status;
    const estimasi = order.estimatedCompletion || order.estimated_completion || "-";
    const tanggal = order.createdAt ? new Date(order.createdAt).toLocaleDateString("id-ID") : "-";
    const telpon = order.customerPhone || order.telepon || "-";
    const alamat = order.address || order.alamat || "-";
    return tpl
      .replace(/\(namacs\)/gi, order.customerName || "-")
      .replace(/\(noorder\)/gi, shortOrderId)
      .replace(/\(namatoko\)/gi, tenant?.businessName || "LaundryPro")
      .replace(/\(status\)/gi, statusLabel)
      .replace(/\(estimasi\)/gi, estimasi)
      .replace(/\(tanggal\)/gi, tanggal)
      .replace(/\(telpon\)/gi, telpon)
      .replace(/\(alamat\)/gi, alamat);
  };

  // Handle send notification
  const handleSendNotification = () => {
    if (!selectedOrder) return;
    
    const message = customMessage.trim() 
      ? encodeURIComponent(customMessage.trim())
      : generateWhatsAppMessage(selectedOrder, tenant?.whatsappNumber);
      
    const whatsAppLink = getWhatsAppDeepLink(
      message,
      selectedOrder.customerPhone.startsWith("+") 
        ? selectedOrder.customerPhone.substring(1) 
        : selectedOrder.customerPhone
    );
    
    window.open(whatsAppLink, "_blank");
    
    toast({
      title: "Notifikasi Dikirim",
      description: `WhatsApp untuk ${selectedOrder.customerName} dibuka.`,
    });
  };

  // Handle send custom notification (simpan ke database atau update jika edit)
  const handleSendCustomNotification = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      if (editId) {
        // Edit mode
        const { error } = await supabase
          .from("notifications")
          .update({ message: editMessage.trim() })
          .eq("id", editId)
          .eq("business_id", tenant.id);
        if (error) throw error;
        setEditId(null);
        setEditMessage("");
        toast({ title: "Pesan custom berhasil diupdate!" });
      } else {
        // Add mode
        if (!customMessage.trim()) return;
        const { error } = await supabase.from("notifications").insert({
          business_id: tenant.id,
          order_id: selectedOrder?.id || null,
          message: customMessage.trim(),
          created_by: null
        });
        if (error) throw error;
        setCustomMessage("");
        toast({ title: "Pesan custom berhasil dikirim!" });
      }
      // Refresh list custom notification
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("business_id", tenant.id)
        .order("created_at", { ascending: false });
      setCustomNotifications(data || []);
    } catch (err: any) {
      setNotifError(err.message || "Gagal mengirim notifikasi custom");
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (notif: any) => {
    console.log('[DEBUG] Edit clicked:', notif.id, notif.message);
    setNotifToEdit(notif);
    setEditModalMessage(notif.message);
    setShowEditModal(true);
    setTimeout(() => {
      editTextareaRef.current?.focus();
    }, 100);
  };

  const handleEditModalSave = async () => {
    if (!notifToEdit) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ message: editModalMessage.trim() })
        .eq("id", notifToEdit.id)
        .eq("business_id", tenant.id);
      if (error) throw error;
      toast({ title: "Pesan custom berhasil diupdate!" });
      setShowEditModal(false);
      setNotifToEdit(null);
      setEditModalMessage("");
      // Refresh list custom notification
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("business_id", tenant.id)
        .order("created_at", { ascending: false });
      setCustomNotifications(data || []);
    } catch (err: any) {
      setNotifError(err.message || "Gagal update notifikasi custom");
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle delete
  const handleDelete = (notif: any) => {
    setNotifToDelete(notif);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!notifToDelete) return;
    setNotifLoading(true);
    setNotifError(null);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notifToDelete.id);
      if (error) throw error;
      toast({ title: "Notifikasi berhasil dihapus!" });
      // Refresh list custom notification
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("business_id", tenant.id)
        .order("created_at", { ascending: false });
      setCustomNotifications(data || []);
      setShowDeleteModal(false);
      setNotifToDelete(null);
    } catch (err: any) {
      setNotifError(err.message || "Gagal menghapus notifikasi custom");
    } finally {
      setNotifLoading(false);
    }
  };

  // Handle add/edit template
  const handleSaveTemplate = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateText.trim() || !tenant?.id) return;
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      if (editTemplateId) {
        // Edit
        const { error } = await supabase
          .from("notification_templates")
          .update({ name: templateName.trim(), template: templateText.trim() })
          .eq("id", editTemplateId)
          .eq("business_id", tenant.id);
        if (error) throw error;
      } else {
        // Add
        const { error } = await supabase
          .from("notification_templates")
          .insert({
            business_id: tenant.id,
            name: templateName.trim(),
            template: templateText.trim(),
          });
        if (error) throw error;
      }
      setTemplateName("");
      setTemplateText("");
      setEditTemplateId(null);
      setShowTemplateModal(false);
    } catch (err: any) {
      setTemplateError(err.message || "Gagal menyimpan template");
    } finally {
      setTemplateLoading(false);
    }
  };

  // Handle edit template
  const handleEditTemplate = (tpl: any) => {
    setTemplateToEdit(tpl);
    setEditTemplateName(tpl.name);
    setEditTemplateText(tpl.template);
    setShowEditTemplateModal(true);
  };

  const handleEditTemplateModalSave = async () => {
    if (!templateToEdit) return;
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const { error } = await supabase
        .from("notification_templates")
        .update({ name: editTemplateName.trim(), template: editTemplateText.trim() })
        .eq("id", templateToEdit.id)
        .eq("business_id", tenant.id);
      if (error) throw error;
      setShowEditTemplateModal(false);
      setTemplateToEdit(null);
      setEditTemplateText("");
      setEditTemplateName("");
      // Refresh list template
      const { data } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("business_id", tenant.id)
        .order("created_at", { ascending: false });
      setTemplates(data || []);
      toast({ title: "Template berhasil diupdate!" });
    } catch (err: any) {
      setTemplateError(err.message || "Gagal update template");
    } finally {
      setTemplateLoading(false);
    }
  };

  // Handle delete template
  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Yakin ingin menghapus template ini?")) return;
    setTemplateLoading(true);
    setTemplateError(null);
    try {
      const { error } = await supabase
        .from("notification_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } catch (err: any) {
      setTemplateError(err.message || "Gagal menghapus template");
    } finally {
      setTemplateLoading(false);
    }
  };

  // Status order yang didukung
  const statusOptions = [
    { value: 'received', label: 'Belum Dicuci' },
    { value: 'washing', label: 'Di Cuci' },
    { value: 'ironing', label: 'Di Setrika' },
    { value: 'ready', label: 'Siap Diambil' },
    { value: 'completed', label: 'Selesai' },
    { value: 'cancelled', label: 'Batal' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Notifikasi WhatsApp</h1>
          <p className="text-muted-foreground">Atur template notifikasi status pesanan ke pelanggan</p>
        </div>
        <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
          Setting Template
        </Button>
      </div>

      {/* Daftar Template Notifikasi */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Daftar Template Notifikasi</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-muted-foreground">Belum ada template.</div>
            ) : (
              <ul className="space-y-2">
                {templates.map(tpl => (
                  <li key={tpl.id} className="border rounded p-2 flex flex-col md:flex-row md:justify-between md:items-center">
                    <div>
                      <div className="font-medium">{statusOptions.find(opt => opt.value === tpl.name)?.label || tpl.name}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-line">{tpl.template}</div>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <Button size="sm" variant="outline" onClick={() => handleEditTemplate(tpl)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(tpl.id)}>Hapus</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal Setting Template Notifikasi */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="max-w-lg overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Setting Template Notifikasi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="space-y-3">
            <Label>Status Order</Label>
            <Select value={templateName} onValueChange={setTemplateName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih status order" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Isi Template</Label>
            <Textarea
              value={templateText}
              onChange={e => setTemplateText(e.target.value)}
              placeholder="Contoh: Halo (namacs), pesanan laundry Anda dengan nomor (noorder) sekarang (status). Estimasi selesai: (estimasi)"
              rows={4}
            />
            <div className="text-xs text-muted-foreground">
              Variabel yang bisa digunakan: (namacs), (noorder), (namatoko), (status), (estimasi), (tanggal), (telepon), (alamat)
            </div>
            <div className="border rounded p-2 bg-gray-50 text-sm mt-2">
              <b>Preview:</b><br />
              {substituteTemplate(templateText, {
                customerName: "Budi Santoso",
                id: "17420af2-1016-4db1-a817-bd724b31bb9a",
                status: "received",
                estimatedCompletion: "12 Juli 2024 10:00",
                createdAt: new Date(),
                customerPhone: "08123456789",
                address: "Jl. Contoh No. 1"
              } as any, { businessName: tenant?.businessName || "LaundryPro" })}
            </div>
            {templateError && <div className="text-xs text-red-500">{templateError}</div>}
            <DialogFooter className="gap-2">
              {editTemplateId && (
                <Button type="button" variant="secondary" onClick={() => {
                  setEditTemplateId(null);
                  setTemplateName("");
                  setTemplateText("");
                }}>Batal Edit</Button>
              )}
              <Button type="submit" disabled={templateLoading || !templateName.trim() || !templateText.trim()}>
                {templateLoading ? "Menyimpan..." : editTemplateId ? "Simpan Perubahan" : "Tambah Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Notifikasi */}
      <ConfirmDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Konfirmasi Hapus Notifikasi</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="py-4">
            Apakah Anda yakin ingin menghapus notifikasi ini?
            <div className="mt-2 p-2 bg-gray-100 rounded text-sm">{notifToDelete?.message}</div>
          </div>
          <ConfirmDialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Batal</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={notifLoading}>
              {notifLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Modal Edit Notifikasi Custom */}
      <ConfirmDialog open={showEditModal} onOpenChange={setShowEditModal}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Edit Notifikasi Custom</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="py-2">
            <textarea
              ref={editTextareaRef}
              className="w-full border rounded p-2 min-h-[80px]"
              value={editModalMessage}
              onChange={e => setEditModalMessage(e.target.value)}
              placeholder="Edit pesan notifikasi..."
              rows={4}
            />
          </div>
          <ConfirmDialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Batal</Button>
            <Button onClick={handleEditModalSave} disabled={notifLoading || !editModalMessage.trim()}>
              {notifLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>

      {/* Modal Edit Template Notifikasi Status */}
      <ConfirmDialog open={showEditTemplateModal} onOpenChange={setShowEditTemplateModal}>
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Edit Template Notifikasi</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="py-2">
            <label className="block text-sm font-medium mb-1">Status Order</label>
            <select
              className="w-full border rounded p-2 mb-2"
              value={editTemplateName}
              onChange={e => setEditTemplateName(e.target.value)}
              disabled
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <label className="block text-sm font-medium mb-1">Isi Template</label>
            <textarea
              className="w-full border rounded p-2 min-h-[80px]"
              value={editTemplateText}
              onChange={e => setEditTemplateText(e.target.value)}
              placeholder="Edit isi template..."
              rows={4}
            />
            <div className="text-xs text-muted-foreground mt-2">
              Variabel: (namacs), (noorder), (namatoko), (status), (estimasi), (tanggal), (telepon), (alamat)
            </div>
            <div className="border rounded p-2 bg-gray-50 text-sm mt-2">
              <b>Preview:</b><br />
              {substituteTemplate(editTemplateText, {
                customerName: "Budi Santoso",
                id: "17420af2-1016-4db1-a817-bd724b31bb9a",
                status: editTemplateName,
                estimatedCompletion: "12 Juli 2024 10:00",
                createdAt: new Date(),
                customerPhone: "08123456789",
                address: "Jl. Contoh No. 1"
              } as any, { businessName: tenant?.businessName || "LaundryPro" })}
            </div>
          </div>
          <ConfirmDialogFooter className="gap-2">
            <Button variant="secondary" onClick={() => setShowEditTemplateModal(false)}>Batal</Button>
            <Button onClick={handleEditTemplateModalSave} disabled={templateLoading || !editTemplateText.trim()}>
              {templateLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  );
};

export default Notifications;