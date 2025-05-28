import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppLayout } from "./components/layout/AppLayout";
import PrivateRoute from "./components/auth/PrivateRoute";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import Tracking from "./pages/Tracking";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import POS from "./pages/POS";
import Inventory from "./pages/Inventory";
import FinancialReports from "./pages/FinancialReports";
import RackManagement from "./pages/RackManagement";
import Auth from "./pages/Auth";
import BusinessProfileSetup from "@/pages/BusinessProfileSetup";
import OwnerRoute from "./components/auth/OwnerRoute";
import OwnerPanel from "./pages/OwnerPanel";
import { OwnerLayout } from "./components/layout/OwnerLayout";
import SuperadminRoute from "./components/auth/SuperadminRoute";
import PlatformAdmin from "./pages/PlatformAdmin";
import { SuperadminLayout } from "./components/layout/SuperadminLayout";
import PlatformSettings from "./pages/PlatformSettings";
import PlatformAdminPremiumPlans from "./pages/PlatformAdminPremiumPlans";
import PremiumPlans from "./pages/PremiumPlans";
import PlatformAdminPaymentMethods from "./pages/PlatformAdminPaymentMethods";
import PilihPaketPremium from "./pages/PilihPaketPremium";
import KonfirmasiPremium from "./pages/KonfirmasiPremium";
import PesananPremium from "./pages/PesananPremium";
import PlatformAdminTenants from "./pages/PlatformAdminTenants";
import DevNotificationPage from "./pages/DevNotificationPage";
import OrderDetail from "./pages/OrderDetail";
import Discussion from "./pages/Discussion";
import DiscussionDetail from "@/pages/DiscussionDetail";
import PlatformAdminReports from "./pages/PlatformAdminReports";
import { useEffect, useRef, useState } from 'react';
import { requestPushPermission } from './utils/pushNotifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapApp } from '@capacitor/app';
import Customers from "./pages/Customers";
import OrderArchive from "./pages/OrderArchive";
import ProfileSettings from "./pages/ProfileSettings";
import ReceiptSettings from "./pages/ReceiptSettings";
import UpdatePassword from "@/pages/UpdatePassword";
import ResetPassword from "@/pages/ResetPassword";
import EmailConfirmation from "@/pages/EmailConfirmation";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import PrivacyConsentDialog from "./components/PrivacyConsentDialog";
import Landing from "./pages/Landing";


const queryClient = new QueryClient();

function AppRoutes() {
  const { businessId, loading, session, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const backHandlerRef = useRef<any>(null);
  const [isMobileApp, setIsMobileApp] = useState(false);
  
  // Deteksi apakah aplikasi dijalankan sebagai mobile app (Capacitor/Cordova)
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        // Cek apakah aplikasi berjalan di Capacitor
        const info = await CapApp.getInfo();
        setIsMobileApp(true);
      } catch (error) {
        // Jika error, berarti bukan mobile app
        setIsMobileApp(false);
      }
    };
    
    checkPlatform();
  }, []);
  
  // Inisialisasi aplikasi

  useEffect(() => {
    // Push notifications sementara dinonaktifkan karena tidak ada file google-services.json
    // Komentar kode di bawah untuk mencegah crash aplikasi
    /*
    PushNotifications.addListener('registration', (token) => {
      // FCM token received
    });
    PushNotifications.addListener('registrationError', (error) => {
      // Handle registration error silently
    });
    // Panggil request permission & register
    requestPushPermission();
    */
  }, []);

  // Handler tombol back Android
  useEffect(() => {
    CapApp.addListener('backButton', () => {
      if (
        location.pathname === "/pos" ||
        location.pathname.startsWith("/orders/")
      ) {
        // Jangan lakukan apapun, biarkan halaman terkait yang handle
        return;
      }
      if (
        location.pathname === "/" ||
        location.pathname === "/owner" ||
        location.pathname === "/platform-admin"
      ) {
        CapApp.exitApp();
      } else {
        navigate(-1);
      }
    }).then((handler) => {
      backHandlerRef.current = handler;
    });
    return () => {
      if (backHandlerRef.current && backHandlerRef.current.remove) {
        backHandlerRef.current.remove();
      }
    };
  }, [location, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center">Loading...</div>;

  // PRIORITAS TERTINGGI: Akses langsung ke landing page harus selalu diizinkan
  if (location.pathname === "/landing") {
    console.log("Landing page accessed directly");
    // Lanjutkan ke route tanpa redirect
    return null; // Eksplisit mengembalikan null untuk melanjutkan ke route
  }
  
  // Allow access to other public pages without any redirection
  if (
    location.pathname === "/updatepassword" || 
    location.pathname === "/confirm-email" ||
    location.pathname === "/privacy-policy" ||
    location.pathname === "/terms-conditions"
  ) {
    console.log("Public page accessed: " + location.pathname);
    // Continue to the routes without redirection
  }
  // Jika di root path "/"
  else if (location.pathname === "/") {
    // Jika mobile app, tetap ke auth flow
    if (isMobileApp) {
      if (!session) {
        return <Navigate to="/auth" replace />;
      }
    } 
    // Jika web browser dan tidak ada session, redirect ke landing
    else if (!session) {
      return <Navigate to="/landing" replace />;
    }
  }
  // Jika belum login dan bukan di halaman auth, redirect ke auth
  else if (!session && location.pathname !== "/auth") {
    return <Navigate to="/auth" replace />;
  }
  // Jika sudah login tapi belum punya bisnis, redirect ke setup bisnis
  else if (session && !businessId && location.pathname !== "/setup-business") {
    return <Navigate to="/setup-business" replace />;
  }
  // Jika sudah punya bisnis, jangan bisa akses halaman setup bisnis lagi
  else if (businessId && location.pathname === "/setup-business") {
    return <Navigate to="/" replace />;
  }
  // Jika role superadmin dan di root, redirect ke /platform-admin
  else if (profile && profile.role === "superadmin" && location.pathname === "/") {
    return <Navigate to="/platform-admin" replace />;
  }
  // Jika role owner dan di root, redirect ke /owner
  else if (profile && profile.role === "owner" && location.pathname === "/") {
    return <Navigate to="/owner" replace />;
  }

  return (
    <>
      <PrivacyConsentDialog />
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/email-confirmation" element={<EmailConfirmation />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-conditions" element={<TermsConditions />} />
        <Route path="/" element={<PrivateRoute><AppLayout><Index /></AppLayout></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><AppLayout><Orders /></AppLayout></PrivateRoute>} />
        <Route path="/orders/:orderId" element={<PrivateRoute><AppLayout><OrderDetail /></AppLayout></PrivateRoute>} />
        <Route path="/order-archive" element={<PrivateRoute><AppLayout><OrderArchive /></AppLayout></PrivateRoute>} />
        <Route path="/tracking" element={<PrivateRoute><AppLayout><Tracking /></AppLayout></PrivateRoute>} />
        <Route path="/notifications" element={<PrivateRoute><AppLayout><Notifications /></AppLayout></PrivateRoute>} />
        <Route path="/pos" element={<PrivateRoute><AppLayout><POS /></AppLayout></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><AppLayout><Customers /></AppLayout></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute><AppLayout><Inventory /></AppLayout></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><AppLayout><FinancialReports /></AppLayout></PrivateRoute>} />
        <Route path="/racks" element={<PrivateRoute><AppLayout><RackManagement /></AppLayout></PrivateRoute>} />
        <Route path="/profile-settings" element={<PrivateRoute><AppLayout><ProfileSettings /></AppLayout></PrivateRoute>} />
        <Route path="/receipt-settings" element={<PrivateRoute><AppLayout><ReceiptSettings /></AppLayout></PrivateRoute>} />
        <Route path="/setup-business" element={<BusinessProfileSetup />} />
        <Route path="/owner" element={<OwnerRoute><OwnerLayout><OwnerPanel /></OwnerLayout></OwnerRoute>} />
        <Route path="/platform-admin" element={<SuperadminRoute><SuperadminLayout><PlatformAdmin /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/platform-admin/reports" element={<SuperadminRoute><SuperadminLayout><PlatformAdminReports /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/platform-admin/settings" element={<SuperadminRoute><SuperadminLayout><PlatformSettings /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/admin/premium-plans" element={<SuperadminRoute><SuperadminLayout><PlatformAdminPremiumPlans /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/admin/payment-methods" element={<SuperadminRoute><SuperadminLayout><PlatformAdminPaymentMethods /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/premium-plans" element={<PrivateRoute><AppLayout><PremiumPlans /></AppLayout></PrivateRoute>} />
        <Route path="/PilihPaketPremium" element={<PrivateRoute><AppLayout><PilihPaketPremium /></AppLayout></PrivateRoute>} />
        <Route path="/KonfirmasiPremium" element={<PrivateRoute><AppLayout><KonfirmasiPremium /></AppLayout></PrivateRoute>} />
        <Route path="/platform-admin/premium-orders" element={<SuperadminRoute><SuperadminLayout><PesananPremium /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/platform-admin/tenants" element={<SuperadminRoute><SuperadminLayout><PlatformAdminTenants /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/platform-admin/dev-notification" element={<SuperadminRoute><SuperadminLayout><DevNotificationPage /></SuperadminLayout></SuperadminRoute>} />
        <Route path="/discussion" element={<PrivateRoute><AppLayout><Discussion /></AppLayout></PrivateRoute>} />
        <Route path="/discussion/:threadId" element={<PrivateRoute><AppLayout><DiscussionDetail /></AppLayout></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <TenantProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TenantProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
