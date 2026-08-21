import { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
const AppDownload = lazy(() => import('./pages/AppDownload'));
const RequestPromise = lazy(() => import('./pages/Client/RequestPromise'));
const ConfirmPromisePayment = lazy(() => import('./pages/Client/ConfirmPromisePayment'));
const PaymentStoryView = lazy(() => import('./pages/Client/PaymentStoryView'));
const ConnectionDoctor = lazy(() => import('./pages/ConnectionDoctor'));
const StaffDashboard = lazy(() => import('./pages/Staff/Dashboard'));
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

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'staff' ? '/staff' : '/client'} replace />;
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
              <Route path="request-promise" element={<RequestPromise />} />
              <Route path="confirm-payment" element={<ConfirmPromisePayment />} />
              <Route path="payment-story" element={<PaymentStoryView />} />
              <Route path="doctor" element={<ConnectionDoctor />} />
              <Route path="settings" element={<Placeholder title="Configuración" description="Aquí se concentrarán tus preferencias y datos de contacto." />} />
            </Route>

            <Route path="/staff" element={<ProtectedRoute role="staff"><Outlet /></ProtectedRoute>}>
              <Route index element={<StaffDashboard />} />
              <Route path="clients" element={<Placeholder title="Gestión de clientes" description="Búsqueda y ficha operativa de clientes." />} />
              <Route path="network" element={<Placeholder title="Estado de red" description="Resumen operativo e incidencias de red." />} />
              <Route path="tools" element={<Placeholder title="Herramientas" description="Herramientas internas para personal autorizado." />} />
            </Route>

            <Route path="/monitor/admin-control-center-2026" element={<ProtectedRoute role="staff"><LiveMonitor /></ProtectedRoute>} />
            <Route path="/finance/internal-revenue-2026" element={<ProtectedRoute role="staff"><FinanceDashboard /></ProtectedRoute>} />
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
