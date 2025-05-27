import { useEffect, useState, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { TenantContext } from "@/contexts/TenantContext";
import { useLocation, useNavigate } from "react-router-dom";

// Logo bank mapping
const bankLogos: Record<string, string> = {
  bca: "https://www.bca.co.id/-/media/Feature/Card/List-Card/Tentang-BCA/Brand-Assets/Logo-BCA/Logo-BCA_Biru.png",
  bri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUA2kqUQIf_RTz3evvjkgAjnKC_piTxR0RUg&s",
  mandiri: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/2560px-Bank_Mandiri_logo_2016.svg.png",
  bni: "https://upload.wikimedia.org/wikipedia/id/thumb/5/55/BNI_logo.svg/2560px-BNI_logo.svg.png",
};

function getBankLogo(bankName: string | null) {
  if (!bankName) return null;
  const name = bankName.toLowerCase();
  if (name.includes("bca")) return bankLogos.bca;
  if (name.includes("bri")) return bankLogos.bri;
  if (name.includes("mandiri")) return bankLogos.mandiri;
  if (name.includes("bni")) return bankLogos.bni;
  return null;
}

// Component for premium package confirmation
export default function KonfirmasiPremium() {
  const [methods, setMethods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState({ nama: "", bank: "", jumlah: "" });
  const [error, setError] = useState("");
  const [waNumber, setWaNumber] = useState<string>("");
  const [waError, setWaError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const { profile, user, businessId } = useAuth();
  const { tenant } = useContext(TenantContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Ambil paket premium dari state router
  useEffect(() => {
    if (location.state && location.state.plan) {
      setPlan(location.state.plan);
    } else {
      // Redirect back to plan selection if no plan is selected
      navigate('/PilihPaketPremium');
    }
  }, [location.state, navigate]);

  useEffect(() => {
    supabase
      .from("owner_payment_methods")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => setMethods(data || []));
    // Ambil nomor WA superadmin
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", "a794ea56-6303-4e2b-b71e-ffe96b0b8b29")
      .single()
      .then(({ data, error }) => {
        if (data && data.phone) setWaNumber(data.phone.replace(/[^0-9]/g, ""));
        else setWaError("Nomor WhatsApp admin tidak ditemukan.");
      });
  }, []);

  async function handleSave() {
    if (!form.nama || !form.bank || !form.jumlah || !selected || !plan) {
      setError("Semua field wajib diisi dan paket premium harus dipilih!");
      return;
    }
    setError("");
    setSaving(true);
    setSuccess(false);
    // Ambil data user dan bisnis
    const userId = user?.id || profile?.id;
    const userFullName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "";
    const businessName = tenant?.businessName || profile?.business_name || "";
    const planId = plan?.id;
    // Validasi UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(String(userId))) {
      setError('User ID bukan UUID!');
      setSaving(false);
      return;
    }
    if (!uuidRegex.test(String(planId))) {
      setError('Plan ID bukan UUID! Hubungi admin untuk perbaikan data paket premium.');
      setSaving(false);
      return;
    }
    try {
      const { error: insertError } = await (supabase as any)
        .from('premium_purchases')
        .insert([{
          user_id: userId,
          user_full_name: userFullName,
          business_id: businessId,
          business_name: businessName,
          plan_id: planId,
          plan_name: plan.name,
          plan_duration_days: plan.duration_days || plan.duration_month * 30,
          plan_description: plan.description,
          harga: plan.price,
          nama_pengirim: form.nama,
          bank_pengirim: form.bank,
          jumlah_transfer: form.jumlah,
          metode: selected.type === "bank" ? selected.bank_name : "QRIS",
          status: "pending",
        }]);
      if (insertError) {
        setError("Gagal menyimpan data pembelian: " + insertError.message);
        setSaving(false);
        return;
      }
      setSuccess(true);
    } catch (e: any) {
      setError("Gagal menyimpan data pembelian: " + e.message);
    }
    setSaving(false);
  }

  function handleConfirmWA() {
    if (!form.nama || !form.bank || !form.jumlah || !selected) {
      setError("Semua field wajib diisi!");
      return;
    }
    setError("");
    const text = encodeURIComponent(
      `Halo admin LaundryPro, konfirmasi pembayaran premium.\nNama pengirim: ${form.nama}\nBank pengirim: ${form.bank}\nJumlah transfer: ${form.jumlah}\nMetode pembayaran: ${selected.type === "bank" ? selected.bank_name : "QRIS"}\nPaket: ${plan?.name || "-"} (${plan?.duration_month || Math.ceil((plan?.duration_days || 0) / 30) || "-"} bulan)\nHarga: Rp ${plan?.price ? Number(plan.price).toLocaleString('id-ID') : "-"}`
    );
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
  }

  // Urutkan metode: bank dulu, qris paling bawah
  const sortedMethods = [
    ...methods.filter(m => m.type === 'bank'),
    ...methods.filter(m => m.type === 'qris'),
  ];

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Konfirmasi Pembayaran Premium</h1>
      
      {/* Selected Plan */}
      {plan && (
        <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-xl text-gray-800">{plan.name}</div>
              <div className="text-sm mb-1">Durasi: <span className="font-semibold text-orange-600">{plan.duration_days || plan.duration_month * 30} hari</span></div>
              <div className="text-lg font-bold text-orange-600 mb-2">Rp {Number(plan.price).toLocaleString('id-ID')}</div>
              
              {plan.features && plan.features.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Fitur:</div>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {plan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-1">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="text-xs text-gray-700 mt-2">{plan.description}</div>
            </div>
            
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => navigate('/PilihPaketPremium')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Pilih Metode Pembayaran</h2>
      <div className="space-y-4 mb-4">
        {sortedMethods.map((m) => (
          <div
            key={m.id}
            className={`border rounded-lg p-3 shadow-sm bg-white flex items-center gap-3 cursor-pointer transition hover:shadow-md ${selected?.id === m.id ? "border-blue-500 ring-2 ring-blue-200" : ""}`}
            onClick={() => setSelected(m)}
          >
            <input
              type="radio"
              name="metode"
              checked={selected?.id === m.id}
              onChange={() => setSelected(m)}
              className="accent-blue-600 mt-1"
            />
            <div className="flex-1 flex items-center gap-3">
              {m.type === "bank" ? (
                <>
                  {getBankLogo(m.bank_name) && (
                    <img src={getBankLogo(m.bank_name)} alt={m.bank_name} className="h-8 w-auto" />
                  )}
                  <div>
                    <div className="font-bold text-base text-gray-800 mb-1">{m.bank_name || "Bank"}</div>
                    <div className="text-xs text-gray-600 font-mono tracking-wide mb-1">{m.account_number}</div>
                    <div className="text-xs text-gray-700">a.n. <span className="font-semibold">{m.account_name}</span></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-sm">QRIS</div>
                  {m.qris_image_path && (
                    <img src={supabase.storage.from('qris').getPublicUrl(m.qris_image_path).data.publicUrl} alt="QRIS" className="h-12 w-auto mt-1 rounded object-contain" style={{maxWidth:'120px'}} />
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <>
          {selected.type === 'qris' && selected.qris_image_path && (
            <div className="flex flex-col items-center mb-4">
              <div className="font-semibold text-sm mb-2">Scan QRIS di bawah ini:</div>
              <img
                src={supabase.storage.from('qris').getPublicUrl(selected.qris_image_path).data.publicUrl}
                alt="QRIS"
                className="h-56 w-auto rounded shadow border object-contain"
                style={{ maxWidth: '100%' }}
              />
              <div className="text-xs text-gray-500 mt-2">Screenshot QRIS ini untuk pembayaran</div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 space-y-3 border">
            <h3 className="font-medium text-sm text-gray-700">Detail Pembayaran</h3>
            <Input placeholder="Nama Pengirim" value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} />
            <Input placeholder="Bank Pengirim" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
            <Input placeholder="Jumlah Transfer" type="number" value={form.jumlah} onChange={e => setForm({ ...form, jumlah: e.target.value })} />
          </div>
        </>
      )}
      {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
      {waError && <div className="text-red-500 mb-2 text-center">{waError}</div>}
      {!success ? (
        <Button className="w-full flex items-center justify-center" onClick={handleSave} disabled={!selected || !plan || saving || !form.nama || !form.bank || !form.jumlah}>
          {saving ? <span className="loader mr-2"></span> : null}
          {saving ? "Menyimpan..." : "Lanjutkan"}
        </Button>
      ) : (
        <Button className="w-full" onClick={handleConfirmWA} disabled={!selected || !waNumber}>Konfirmasi via WhatsApp</Button>
      )}
    </div>
  );
}
