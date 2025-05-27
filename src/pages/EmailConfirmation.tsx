import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EmailConfirmation = () => {
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Cek apakah ada token di URL
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        const pathname = window.location.pathname;
        
        console.log("URL hash:", hash);
        console.log("URL search params:", window.location.search);
        console.log("URL pathname:", pathname);
        
        // Jika ini adalah halaman konfirmasi email, coba verifikasi
        if (pathname === '/confirm-email') {
          // Supabase akan menangani verifikasi secara otomatis
          // Kita hanya perlu memeriksa apakah pengguna sudah terautentikasi
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error checking session:", error);
            setError("Gagal memverifikasi email. Silakan coba lagi atau hubungi dukungan.");
            setVerifying(false);
            return;
          }
          
          if (data?.session) {
            console.log("User is authenticated after email confirmation");
            setSuccess(true);
            setVerifying(false);
            
            toast({
              title: "Email berhasil dikonfirmasi",
              description: "Akun Anda telah diaktifkan. Anda sekarang dapat login.",
            });
            
            // Redirect ke halaman login setelah 3 detik
            setTimeout(() => {
              navigate('/auth');
            }, 3000);
          } else {
            // Jika tidak ada sesi, mungkin ada masalah dengan token
            console.log("No session found after email confirmation");
            setError("Link konfirmasi email tidak valid atau sudah kedaluwarsa. Silakan coba lagi.");
            setVerifying(false);
          }
        } else {
          // Jika bukan halaman konfirmasi email, tampilkan error
          setError("Halaman ini hanya untuk konfirmasi email.");
          setVerifying(false);
        }
      } catch (error: any) {
        console.error("Error during email confirmation:", error);
        setError(error?.message || "Terjadi kesalahan saat mengonfirmasi email Anda.");
        setVerifying(false);
      }
    };

    confirmEmail();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="text-3xl font-bold text-center">
              <span className="text-laundry-primary">Laundry</span>
              <span className="text-laundry-accent">Pro</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">
            {verifying ? "Memverifikasi Email" : success ? "Email Dikonfirmasi" : "Verifikasi Gagal"}
          </CardTitle>
          <CardDescription className="text-center">
            {verifying 
              ? "Mohon tunggu sementara kami memverifikasi email Anda..."
              : success 
                ? "Email Anda telah berhasil dikonfirmasi."
                : "Terjadi masalah saat memverifikasi email Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          
          {verifying ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-laundry-primary"></div>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 mt-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Anda akan diarahkan ke halaman login dalam beberapa detik...
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/auth')}
              >
                Pergi ke Login
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 mt-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/auth')}
              >
                Kembali ke Login
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/auth" className="text-sm text-laundry-primary hover:underline">
            Kembali ke Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
