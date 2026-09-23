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

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminPartners from "./pages/AdminPartners";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GlobalQuickExit } from "@/components/screening/GlobalQuickExit";
import { I18nProvider } from "@/i18n";

import ResetPassword from "./pages/ResetPassword";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <I18nProvider>
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

            <Route path="/privacy" element={<Privacy />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allow={["admin"]}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/partners" element={<ProtectedRoute allow={["admin"]}><AdminPartners /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </I18nProvider>
  </ErrorBoundary>
);

export default App;
