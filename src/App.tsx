import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Intake from "./pages/Intake";
import Track from "./pages/Track";
import Recover from "./pages/Recover";
import SelfReport from "./pages/SelfReport";
import ReferralRespond from "./pages/ReferralRespond";

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPartners from "./pages/AdminPartners";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalQuickExit } from "@/components/screening/GlobalQuickExit";
import { I18nProvider } from "@/i18n";

import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import Rights from "./pages/Rights";
import NotFound from "./pages/NotFound";
import ProjectReport from "./pages/ProjectReport";
import AccessReview from "./pages/AccessReview";
import MySettings from "./pages/MySettings";

const queryClient = new QueryClient();

const App = () => (
  <I18nProvider>
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GlobalQuickExit />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/intake" element={<Intake />} />
            <Route path="/report" element={<SelfReport />} />
            <Route path="/track" element={<Track />} />
            <Route path="/recover" element={<Recover />} />
            <Route path="/referral/:token" element={<ReferralRespond />} />

            <Route path="/privacy" element={<Privacy />} />
            <Route path="/rights" element={<Rights />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><MySettings /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allow={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/partners" element={<ProtectedRoute allow={["admin"]}><AdminPartners /></ProtectedRoute>} />
            <Route path="/admin/report" element={<ProtectedRoute allow={["admin", "manager"]}><ProjectReport /></ProtectedRoute>} />
            <Route path="/admin/access-review" element={<ProtectedRoute allow={["admin", "manager"]}><AccessReview /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  </I18nProvider>
);

export default App;
