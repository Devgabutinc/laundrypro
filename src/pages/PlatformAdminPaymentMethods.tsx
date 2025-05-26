import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database } from "@/integrations/supabase/types";

const typeOptions = [
  { value: "bank", label: "Bank" },
  { value: "qris", label: "QRIS" },
];

type PaymentMethod = Database['public']['Tables']['owner_payment_methods']['Row'];

enum FormMode {
  ADD = 'add',
  EDIT = 'edit',
}

export default function PlatformAdminPaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<PaymentMethod>>({ type: 'bank', is_active: true });
  const [qrisFile, setQrisFile] = useState<File | null>(null);
  const [mode, setMode] = useState<FormMode>(FormMode.ADD);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMethods();
  }, []);

  async function fetchMethods() {
    setLoading(true);
    const { data } = await supabase
      .from("owner_payment_methods")
      .select("*")
      .order("created_at", { ascending: false });
    setMethods(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  function openAdd() {
    setForm({ type: 'bank', is_active: true });
    setMode(FormMode.ADD);
    setEditId(null);
  }
  function openEdit(method: PaymentMethod) {
    setForm(method);
    setMode(FormMode.EDIT);
    setEditId(method.id);
  }
  function closeForm() {
    setForm({ type: 'bank', is_active: true });
    setMode(FormMode.ADD);
    setEditId(null);
  }

  async function handleSave() {
    setSaving(true);
    let qrisPath = form.qris_image_path || null;
    if (form.type === 'qris' && qrisFile) {
      if (qrisFile.type === 'image/png') {
        const fileName = `qris_${Date.now()}.png`;
        const { data, error } = await supabase.storage.from('qris').upload(fileName, qrisFile, { upsert: true, contentType: 'image/png' });
        if (!error) {
          qrisPath = fileName;
        } else {
          alert("Gagal upload QRIS: " + error.message);
          setSaving(false);
          return;
        }
      }
    }
    const payload = { ...form, qris_image_path: qrisPath, type: form.type || 'bank' };
    if (mode === FormMode.EDIT && editId) {
      await supabase
        .from("owner_payment_methods")
        .update(payload)
        .eq("id", editId);
    } else {
      await supabase
        .from("owner_payment_methods")
        .insert([payload]);
    }
    await fetchMethods();
    setSaving(false);
    closeForm();
    setQrisFile(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Yakin hapus metode pembayaran ini?")) return;
    await supabase
      .from("owner_payment_methods")
      .delete()
      .eq("id", id);
    await fetchMethods();
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Metode Pembayaran Owner</h1>
      <div className="bg-gray-50 border rounded-lg p-4 mb-6">
        <h2 className="font-bold text-lg mb-2">{mode === FormMode.EDIT ? "Edit" : "Tambah"} Metode Pembayaran</h2>
        <div className="space-y-2">
          <label className="block text-xs font-semibold mb-1">Tipe</label>
          <select
            className="w-full border rounded px-2 py-2 text-sm mb-2"
            value={form.type || "bank"}
            onChange={e => setForm({ ...form, type: e.target.value })}
          >
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {form.type === 'bank' && (
            <>
              <Input placeholder="Nama Bank" value={form.bank_name || ""} onChange={e => setForm({ ...form, bank_name: e.target.value })} />
              <Input placeholder="Nomor Rekening" value={form.account_number || ""} onChange={e => setForm({ ...form, account_number: e.target.value })} />
              <Input placeholder="Nama Pemilik Rekening" value={form.account_name || ""} onChange={e => setForm({ ...form, account_name: e.target.value })} />
            </>
          )}
          {form.type === 'qris' && (
            <>
              <input type="file" accept="image/png" onChange={e => setQrisFile(e.target.files?.[0] || null)} />
              {form.qris_image_path && (
                <img src={supabase.storage.from('qris').getPublicUrl(form.qris_image_path).data.publicUrl} alt="QRIS" className="h-16 mt-2" />
              )}
            </>
          )}
          <label className="block text-xs font-semibold mb-1">Status</label>
          <select
            className="w-full border rounded px-2 py-2 text-sm mb-2"
            value={form.is_active ? "active" : "inactive"}
            onChange={e => setForm({ ...form, is_active: e.target.value === "active" })}
          >
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={closeForm}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>{mode === FormMode.EDIT ? "Simpan" : "Tambah"}</Button>
        </div>
      </div>
      <table className="min-w-full text-sm border rounded-lg overflow-hidden bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Tipe</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Bank/QRIS</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Nomor/QRIS</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Nama</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {methods.map(method => (
            <tr key={method.id} className="border-b last:border-0">
              <td>{method.type === 'bank' ? 'Bank' : 'QRIS'}</td>
              <td>{method.type === 'bank' ? method.bank_name : method.qris_image_path ? <img src={supabase.storage.from('qris').getPublicUrl(method.qris_image_path).data.publicUrl} alt="QRIS" className="h-8" /> : '-'}</td>
              <td>{method.type === 'bank' ? method.account_number : method.qris_image_path}</td>
              <td>{method.type === 'bank' ? method.account_name : '-'}</td>
              <td>{method.is_active ? 'Aktif' : 'Nonaktif'}</td>
              <td>
                <Button size="sm" variant="outline" onClick={() => openEdit(method)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(method.id)} className="ml-2">Hapus</Button>
              </td>
            </tr>
          ))}
          {!loading && methods.length === 0 && (
            <tr><td colSpan={6} className="text-center text-gray-500 py-4">Belum ada metode pembayaran.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 