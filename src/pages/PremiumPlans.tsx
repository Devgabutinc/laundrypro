import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";

const statusLabel: Record<string, string> = {
  active: "Active",
  inactive: "Tidak Tersedia",
  coming_soon: "Coming Soon",
};

type PremiumPlan = Database['public']['Tables']['premium_plans']['Row'];

export default function PremiumPlans() {
  const [plans, setPlans] = useState<PremiumPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  async function fetchPlans() {
    setLoading(true);
    const { data } = await supabase
      .from("premium_plans")
      .select("*")
      .order("price", { ascending: true });
    setPlans(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Pilih Paket Premium</h1>
      {loading && <div>Loading...</div>}
      <div className="grid gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="border rounded-lg p-4 shadow bg-white relative">
            <div className="flex justify-between items-center mb-2">
              <div className="font-bold text-lg">{plan.name}</div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${plan.status === 'active' ? 'bg-green-100 text-green-700' : plan.status === 'coming_soon' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>{statusLabel[plan.status]}</span>
            </div>
            <div className="text-xl font-bold text-orange-600 mb-1">Rp {Number(plan.price).toLocaleString('id-ID')}</div>
            <div className="text-xs text-gray-500 mb-2">Durasi: {plan.duration_days} hari</div>
            <div className="mb-2 text-sm text-gray-700">{plan.description}</div>
            <ul className="list-disc pl-5 text-xs mb-3">
              {plan.features?.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            <Button
              className="w-full mt-2"
              disabled={plan.status !== 'active'}
              variant={plan.status === 'active' ? 'default' : 'outline'}
              onClick={() => plan.status === 'active' && navigate('/PilihPaketPremium', { state: { plan } })}
            >
              {plan.status === 'active' ? 'Pilih Paket' : statusLabel[plan.status]}
            </Button>
          </div>
        ))}
        {!loading && plans.length === 0 && (
          <div className="text-center text-gray-500">Belum ada paket premium.</div>
        )}
      </div>
    </div>
  );
} 