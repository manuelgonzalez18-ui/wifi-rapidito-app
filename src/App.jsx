import { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './auth/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import WhatsAppBubble from './components/ui/WhatsAppBubble';

const LoginPage = lazy(() => import('./pages/Login'));
const ClientDashboard = lazy(() => import('./pages/Client/Dashboard'));
const PaymentReport = lazy(() => import('./pages/Client/PaymentReport'));
const Invoices = lazy(() => import('./pages/Client/Invoices'));
const InvoiceDetail = lazy(() => import('./pages/Client/InvoiceDetail'));
const Support = lazy(() => import('./pages/Client/Support'));
const Settings = lazy(() => import('./pages/Client/Settings'));
const AppDownload = lazy(() => import('./pages/AppDownload'));
const RequestPromise = lazy(() => import('./pages/Client/RequestPromise'));
const PromiseGate = lazy(() => import('./pages/Client/PromiseGate'));
const ConfirmPromisePayment = lazy(() => import('./pages/Client/ConfirmPromisePayment'));
const PaymentStoryView = lazy(() => import('./pages/Client/PaymentStoryView'));
const ConnectionDoctor = lazy(() => import('./pages/ConnectionDoctor'));
const StaffDashboard = lazy(() => import('./pages/Staff/Dashboard'));
const StaffSupportDashboard = lazy(() => import('./pages/Staff/SupportDashboard'));
const StaffAccess = lazy(() => import('./pages/Staff/StaffAccess'));
const PromiseRestrictions = lazy(() => import('./pages/Staff/PromiseRestrictions'));
const LiveMonitor = lazy(() => import('./pages/Admin/LiveMonitor'));
const FinanceDashboard = lazy(() => import('./pages/Admin/FinanceDashboard'));

const RouteLoader = () => (
  <div className="flex min-h-[45vh] items-center justify-center">
    <div className="flex items-center gap-3 text-sm font-medium text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-cyan-400" />
      Cargando…
    </div>
  </div>
);

const hasPermission = (user, permission) => {
  if (!permission) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  return permissions.includes('*') || permissions.includes(permission);
};

const ProtectedRoute = ({ children, role, permission }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'staff' ? '/staff' : '/client'} replace />;
  }

  if (permission && !hasPermission(user, permission)) {
    const fallback = hasPermission(user, 'support') ? '/staff/support' : '/staff';
    return <Navigate to={fallback} replace />;
  }

  return children;
};

const Placeholder = ({ title, description }) => (
  <div className="app-surface p-7">
    <p className="app-eyebrow">Wifi Rapidito</p>
    <h1 className="text-2xl font-bold text-white">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
  </div>
);

function App() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.resolve(loadUser()).finally(() => {
      if (mounted) setAuthReady(true);
    });
    return () => { mounted = false; };
  }, [loadUser]);

  if (!authReady) return <RouteLoader />;

  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/descargar" element={<AppDownload />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<DashboardLayout />}>
            <Route path="/client" element={<ProtectedRoute role="client"><Outlet /></ProtectedRoute>}>
              <Route index element={<ClientDashboard />} />
              <Route path="payments" element={<PaymentReport />} />
              <Route path="invoices" element={<Invoices />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="support" element={<Support />} />
              <Route path="request-promise" element={<PromiseGate><RequestPromise /></PromiseGate>} />
              <Route path="confirm-payment" element={<ConfirmPromisePayment />} />
              <Route path="payment-story" element={<PaymentStoryView />} />
              <Route path="doctor" element={<ConnectionDoctor />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="/staff" element={<ProtectedRoute role="staff"><Outlet /></ProtectedRoute>}>
              <Route index element={<StaffDashboard />} />
              <Route path="support" element={<ProtectedRoute permission="support"><StaffSupportDashboard /></ProtectedRoute>} />
              <Route path="access" element={<ProtectedRoute permission="manage_staff"><StaffAccess /></ProtectedRoute>} />
              <Route path="promise-restrictions" element={<ProtectedRoute permission="manage_staff"><PromiseRestrictions /></ProtectedRoute>} />
              <Route path="clients" element={<ProtectedRoute permission="manage_staff"><Placeholder title="Gestión de clientes" description="Búsqueda y ficha operativa de clientes." /></ProtectedRoute>} />
              <Route path="network" element={<ProtectedRoute permission="network"><Placeholder title="Estado de red" description="Resumen operativo e incidencias de red." /></ProtectedRoute>} />
              <Route path="tools" element={<ProtectedRoute permission="manage_staff"><Placeholder title="Herramientas" description="Herramientas internas para personal autorizado." /></ProtectedRoute>} />
            </Route>

            <Route path="/monitor/admin-control-center-2026" element={<ProtectedRoute role="staff" permission="network"><LiveMonitor /></ProtectedRoute>} />
            <Route path="/finance/internal-revenue-2026" element={<ProtectedRoute role="staff" permission="finance"><FinanceDashboard /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4200,
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(148,163,184,0.16)',
            borderRadius: '14px',
            boxShadow: '0 18px 50px -24px rgba(0,0,0,.9)'
          }
        }}
      />
      <WhatsAppBubble />
    </Router>
  );
}

export default App;
