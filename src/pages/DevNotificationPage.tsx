import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DevNotificationPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionType, setActionType] = useState("none");
  const [customAction, setCustomAction] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [paketFilter, setPaketFilter] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Hardcode Supabase URL & KEY
  const supabaseUrl = "https://igogxmfqfsxubjbtrguf.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb2d4bWZxZnN4dWJqYnRyZ3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Njg4NzY1MywiZXhwIjoyMDYyNDYzNjUzfQ.rvCcqQnJweCQTtuBo3_YM7H5HzK6GdTZAQtWfIYi46E";

  // Define action types available in the mobile app
  const actionOptions = [
    { label: "Tidak ada action", value: "none" },
    { label: "Perpanjang Premium", value: "premium" },
    { label: "Ke Halaman Profil", value: "profile" },
    { label: "Ke Halaman Dashboard", value: "dashboard" },
    { label: "Ke Halaman Orders", value: "orders" },
    { label: "Ke Halaman Settings", value: "settings" },
    { label: "Custom/manual", value: "custom" },
  ];

  // Get the appropriate action URL for mobile navigation
  const getActionUrl = () => {
    // For mobile app navigation, we use relative paths without domain
    switch(actionType) {
      case "premium": return "/premium-plans";
      case "profile": return "/profile";
      case "dashboard": return "/dashboard";
      case "orders": return "/orders";
      case "settings": return "/settings";
      case "custom": 
        // For custom URLs, ensure they're properly formatted for mobile
        const url = customAction.trim();
        // If it's an external URL, keep it as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        // If it's an internal path, ensure it starts with /
        return url.startsWith('/') ? url : `/${url}`;
      default:
        return null;
    }
  };

  // Fetch notifications on initial load and when success state changes
  useEffect(() => {
    refreshNotifications();
  }, [success]);

  // Fetch users
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, first_name, last_name, role, business_id")
      .then(({ data }) => setUsers(data || []));
  }, []);

  // Fetch status paket bisnis
  const [businesses, setBusinesses] = useState<any[]>([]);
  useEffect(() => {
    supabase
      .from("businesses")
      .select("id, status")
      .then(({ data }) => setBusinesses(data || []));
  }, []);

  // Gabungkan status paket ke user
  const usersWithPaket = useMemo(() => {
    return users.map(u => {
      const bisnis = businesses.find(b => b.id === u.business_id);
      return {
        ...u,
        paket: bisnis?.status || "free"
      };
    });
  }, [users, businesses]);

  // Filter user
  const filteredUsers = useMemo(() => {
    return usersWithPaket.filter(u => {
      const nama = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
      const matchNama = userFilter === "" || nama.includes(userFilter.toLowerCase());
      const matchRole = roleFilter === "" || (u.role || "").toLowerCase() === roleFilter;
      const matchPaket = paketFilter === "" || (u.paket || "free").toLowerCase() === paketFilter;
      return matchNama && matchRole && matchPaket;
    });
  }, [usersWithPaket, userFilter, roleFilter, paketFilter]);

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length;
    }
  }, [selectedUserIds, filteredUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      // 1. Simpan notifikasi ke Supabase
      const notifRes = await fetch(`${supabaseUrl}/rest/v1/developer_notifications`, {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          title,
          message,
          is_active: true,
          action_url: getActionUrl() || null,
          target_user_ids: selectedUserIds.length > 0 ? selectedUserIds : null
        })
      });
      const notifData = await notifRes.json();
      if (!notifRes.ok || !notifData[0]?.id) throw new Error("Gagal menyimpan notifikasi ke database");
      const notif_id = notifData[0].id;

      // 2. Trigger broadcast notifikasi ke API Supabase Function
      let apiRes;
      try {
        apiRes = await fetch("https://igogxmfqfsxubjbtrguf.functions.supabase.co/broadcast_dev_notification", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ notif_id })
        });
      } catch (err) {
        throw err;
      }
      if (!apiRes.ok) {
        let text = await apiRes.text();
        throw new Error("Gagal mengirim notifikasi ke device");
      }
      setSuccess(true);
      setTitle("");
      setMessage("");
      setActionType("none");
      setCustomAction("");
      setSelectedUserIds([]);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAction = (notif: any) => {
    setEditingId(notif.id);
    setEditingAction(notif.action_url || "");
  };

  const handleSaveAction = async (notif: any) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/developer_notifications?id=eq.${notif.id}`, {
      method: "PATCH",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ action_url: editingAction })
    });
    if (res.ok) {
      setEditingId(null);
      setEditingAction("");
      // Refresh list
      refreshNotifications();
    }
  };

  // Function to refresh the notifications list
  const refreshNotifications = () => {
    fetch(`${supabaseUrl}/rest/v1/developer_notifications?select=*`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setNotifications(data || []));
  };

  // Function to handle delete confirmation
  const handleDeleteConfirm = (notifId: string) => {
    setDeleteConfirmId(notifId);
  };

  // Function to cancel delete
  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  // Function to execute delete
  const handleDeleteNotification = async (notifId: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/developer_notifications?id=eq.${notifId}`, {
        method: "DELETE",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });
      
      if (res.ok) {
        // Remove from local state
        setNotifications(notifications.filter(n => n.id !== notifId));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error("Gagal menghapus notifikasi");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menghapus notifikasi");
      setTimeout(() => setError(""), 3000);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Kirim Notifikasi Developer</h2>
      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block font-semibold mb-1">Judul</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Pesan</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Action</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={actionType}
            onChange={e => setActionType(e.target.value)}
          >
            {actionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {actionType === "custom" && (
            <div className="space-y-2 mt-2">
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Masukkan link action, contoh: /profile atau orders"
                value={customAction}
                onChange={e => setCustomAction(e.target.value)}
                required
              />
              <div className="text-xs text-gray-500">
                <p>Tips untuk action di mobile app:</p>
                <ul className="list-disc pl-5">
                  <li>Gunakan path relatif seperti "/profile" atau "/orders" untuk navigasi dalam app</li>
                  <li>Jangan gunakan "localhost" karena tidak berfungsi di mobile</li>
                  <li>Untuk URL eksternal, gunakan format lengkap "https://..."</li>
                </ul>
              </div>
            </div>
          )}
        </div>
        <div>
          <label className="block font-semibold mb-1">Target User</label>
          <div className="flex gap-2 mb-2">
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Cari nama user"
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              style={{ minWidth: 120 }}
            />
            <select
              className="border rounded px-2 py-1 text-sm"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">Semua Role</option>
              <option value="superadmin">Superadmin</option>
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
            </select>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={paketFilter}
              onChange={e => setPaketFilter(e.target.value)}
            >
              <option value="">Semua Paket</option>
              <option value="premium">Premium</option>
              <option value="free">Free</option>
            </select>
          </div>
          {/* Tabel user hasil filter */}
          <div className="overflow-x-auto border rounded bg-gray-50">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUserIds.includes(u.id))}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedUserIds(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUserIds(selectedUserIds.filter(id => !filteredUsers.some(u => u.id === id)));
                        }
                      }}
                    /> Pilih Semua
                  </th>
                  <th className="p-2 text-left">Nama</th>
                  <th className="p-2 text-left">Role</th>
                  <th className="p-2 text-left">Paket</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-gray-500 p-2">Tidak ada user ditemukan</td></tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(u.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedUserIds([...selectedUserIds, u.id]);
                            else setSelectedUserIds(selectedUserIds.filter(id => id !== u.id));
                          }}
                        />
                      </td>
                      <td className="p-2">{u.first_name} {u.last_name}</td>
                      <td className="p-2">{u.role || "-"}</td>
                      <td className="p-2">{u.paket}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <button
          type="submit"
          className="bg-laundry-primary text-white px-4 py-2 rounded font-bold disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Mengirim..." : "Kirim Notifikasi"}
        </button>
        {success && <div className="text-green-600 font-semibold">Notifikasi berhasil dikirim!</div>}
        {error && <div className="text-red-600 font-semibold">{error}</div>}
      </form>
      <h3 className="font-bold mb-2 mt-8">Daftar Notifikasi Developer</h3>
      <div className="space-y-2">
        {notifications.map((notif) => (
          <div key={notif.id} className="border rounded p-3 flex flex-col md:flex-row md:items-center gap-2 bg-white">
            <div className="flex-1">
              <div className="font-semibold">{notif.title}</div>
              <div className="text-sm text-gray-700">{notif.message}</div>
              {notif.action_url && (
                <div className="text-xs break-all">
                  <span className="font-medium">Action: </span>
                  <span className="text-blue-600">
                    {notif.action_url.startsWith('http') ? (
                      // External URL
                      <span>URL Eksternal: {notif.action_url}</span>
                    ) : (
                      // Internal navigation
                      <span>Navigasi ke: {notif.action_url}</span>
                    )}
                  </span>
                </div>
              )}
            </div>
            {deleteConfirmId === notif.id ? (
              <div className="flex gap-2 items-center">
                <div className="text-sm text-red-600 font-medium">Yakin hapus?</div>
                <button 
                  className="bg-red-500 text-white px-2 py-1 rounded text-xs" 
                  onClick={() => handleDeleteNotification(notif.id)} 
                  type="button"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Menghapus..." : "Ya, Hapus"}
                </button>
                <button 
                  className="bg-gray-300 px-2 py-1 rounded text-xs" 
                  onClick={handleDeleteCancel} 
                  type="button"
                  disabled={deleteLoading}
                >
                  Batal
                </button>
              </div>
            ) : editingId === notif.id ? (
              <div className="flex gap-2 items-center">
                <div className="space-y-1">
                  <input
                    className="border px-2 py-1 rounded text-xs w-full"
                    placeholder="/profile atau https://..."
                    value={editingAction}
                    onChange={e => setEditingAction(e.target.value)}
                  />
                  <div className="text-xs text-gray-500">
                    Untuk navigasi dalam app, gunakan path seperti "/profile"
                  </div>
                </div>
                <button className="bg-green-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleSaveAction(notif)} type="button">Simpan</button>
                <button className="bg-gray-300 px-2 py-1 rounded text-xs" onClick={() => setEditingId(null)} type="button">Batal</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button className="bg-blue-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleEditAction(notif)} type="button">Set/Edit Action</button>
                <button className="bg-red-500 text-white px-2 py-1 rounded text-xs" onClick={() => handleDeleteConfirm(notif.id)} type="button">Hapus</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 