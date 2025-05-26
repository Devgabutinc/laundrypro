import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Interface for Premium Plan
interface PremiumPlan {
  id: string;
  name: string;
  price: string;
  duration_days?: number;
  duration_month?: number;
  description?: string;
  features?: string[];
  is_active?: boolean;
  status?: string;
}

export default function PilihPaketPremium() {
  const [availablePlans, setAvailablePlans] = useState<PremiumPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PremiumPlan | null>(null);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();

  // Function to proceed to payment page
  const proceedToPayment = () => {
    if (!selectedPlan) {
      setError("Silakan pilih paket premium terlebih dahulu");
      return;
    }
    
    navigate('/KonfirmasiPremium', { state: { plan: selectedPlan } });
  };

  // Fetch available premium plans
  useEffect(() => {
    const fetchPremiumPlans = async () => {
      setLoadingPlans(true);
      try {
        const { data, error } = await supabase
          .from('premium_plans')
          .select('*')
          .eq('status', 'active')
          .order('price', { ascending: true });

        if (error) throw error;
        setAvailablePlans(data || []);
      } catch (err) {
        console.error('Error fetching premium plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPremiumPlans();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-center">Pilih Paket Premium</h1>
      
      {/* Available Plans */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Paket Tersedia</h2>
        {loadingPlans ? (
          <div className="text-center py-8 text-gray-500">Memuat paket premium...</div>
        ) : availablePlans.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Tidak ada paket premium tersedia saat ini.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {availablePlans.map((p) => (
              <div 
                key={p.id} 
                className={`border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition cursor-pointer ${selectedPlan?.id === p.id ? 'border-orange-500 ring-2 ring-orange-200' : ''}`}
                onClick={() => setSelectedPlan(p)}
              >
                <div className="font-bold text-lg text-gray-800">{p.name}</div>
                <div className="text-sm mb-2">Durasi: <span className="font-semibold text-orange-600">{p.duration_days || p.duration_month * 30} hari</span></div>
                <div className="text-lg font-bold text-orange-600 mb-2">Rp {Number(p.price).toLocaleString('id-ID')}</div>
                
                {p.features && p.features.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-gray-600 mb-1">Fitur:</div>
                    <ul className="text-xs text-gray-700 space-y-1">
                      {p.features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-1">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="text-xs text-gray-600 mt-2">{p.description}</div>
                <button 
                  className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md text-sm font-medium transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(p);
                  }}
                >
                  Pilih Paket
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected Plan */}
      {selectedPlan && (
        <div className="mb-6 p-4 rounded-lg bg-orange-50 border border-orange-200">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-xl text-gray-800">{selectedPlan.name}</div>
              <div className="text-sm mb-1">Durasi: <span className="font-semibold text-orange-600">{selectedPlan.duration_days} hari</span></div>
              <div className="text-lg font-bold text-orange-600 mb-2">Rp {Number(selectedPlan.price).toLocaleString('id-ID')}</div>
              
              {selectedPlan.features && selectedPlan.features.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-semibold text-gray-700 mb-1">Fitur:</div>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {selectedPlan.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-500 mr-1">✓</span> {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="text-xs text-gray-700 mt-2">{selectedPlan.description}</div>
            </div>
            
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedPlan(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {error && <div className="text-red-500 mb-2 text-center">{error}</div>}
      
      {selectedPlan && (
        <button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-md font-medium transition"
          onClick={proceedToPayment}
        >
          Lanjutkan ke Pembayaran
        </button>
      )}
    </div>
  );
} 