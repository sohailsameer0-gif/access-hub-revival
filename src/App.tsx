import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import PublicMenu from "./pages/PublicMenu";
import DashboardLayout from "./components/DashboardLayout";
import DashboardOverview from "./pages/dashboard/Overview";
import OutletProfile from "./pages/dashboard/OutletProfile";
import MenuManagement from "./pages/dashboard/MenuManagement";
import TableManagement from "./pages/dashboard/TableManagement";
import QRCodes from "./pages/dashboard/QRCodes";
import OrdersDashboard from "./pages/dashboard/OrdersDashboard";
import PaymentsDashboard from "./pages/dashboard/PaymentsDashboard";
import ReportsPage from "./pages/dashboard/ReportsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import Subscribe from "./pages/dashboard/Subscribe";
import StaffManagement from "./pages/dashboard/StaffManagement";
import OutletVerify from "./pages/OutletVerify";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOutlets from "./pages/admin/AdminOutlets";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminPlanRequests from "./pages/admin/AdminPlanRequests";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminReports from "./pages/admin/AdminReports";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/menu/:slug" element={<PublicMenu />} />
              <Route path="/outlet/verify" element={<ProtectedRoute requireOutletOwner><OutletVerify /></ProtectedRoute>} />
              <Route path="/outlet" element={<ProtectedRoute requireOutletOwner><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DashboardOverview />} />
                <Route path="profile" element={<OutletProfile />} />
                <Route path="menu" element={<MenuManagement />} />
                <Route path="tables" element={<TableManagement />} />
                <Route path="orders" element={<OrdersDashboard />} />
                <Route path="staff" element={<StaffManagement />} />
                <Route path="qr" element={<QRCodes />} />
                <Route path="payments" element={<PaymentsDashboard />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="subscribe" element={<Subscribe />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
              {/* Backwards-compat: old /dashboard links redirect to /outlet */}
              <Route path="/dashboard" element={<Navigate to="/outlet" replace />} />
              <Route path="/dashboard/*" element={<Navigate to="/outlet" replace />} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="outlets" element={<AdminOutlets />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="plan-requests" element={<AdminPlanRequests />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="payment-methods" element={<AdminPaymentMethods />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="logs" element={<AdminActivityLogs />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
