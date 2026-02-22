import { HashRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/Login';
import ClientDashboard from './pages/Client/Dashboard';
import PaymentReport from './pages/Client/PaymentReport';
import Invoices from './pages/Client/Invoices';
import Support from './pages/Client/Support';
import AppDownload from './pages/AppDownload';
import RequestPromise from './pages/Client/RequestPromise';
import ConfirmPromisePayment from './pages/Client/ConfirmPromisePayment';
import ConnectionDoctor from './pages/ConnectionDoctor';
import StaffDashboard from './pages/Staff/Dashboard';
import InvoiceDetail from './pages/Client/InvoiceDetail';
import PaymentStoryView from './pages/Client/PaymentStoryView';
import LiveMonitor from './pages/Admin/LiveMonitor';
import DashboardLayout from './layouts/DashboardLayout';
import FinanceDashboard from './pages/Admin/FinanceDashboard';
import { motion } from 'framer-motion';
import { LogOut, Wifi, User, LayoutDashboard, CreditCard, LifeBuoy, Users, Activity, Settings, FileText, Handshake } from 'lucide-react';
import useAuthStore from './auth/authStore';
import { Toaster } from 'react-hot-toast';
import WhatsAppBubble from './components/ui/WhatsAppBubble';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'staff' ? '/staff' : '/client'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/descargar" element={<AppDownload />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Secure Admin Monitor & Finance Routes */}
        <Route path="/monitor/admin-control-center-2026" element={<LiveMonitor />} />
        <Route path="/finance/internal-revenue-2026" element={<FinanceDashboard />} />

        {/* Protected Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/client" element={
            <ProtectedRoute role="client">
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="payments" element={<PaymentReport />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="invoices/:id" element={<InvoiceDetail />} />
            <Route path="support" element={<Support />} />
            <Route path="request-promise" element={<RequestPromise />} />
            <Route path="confirm-payment" element={<ConfirmPromisePayment />} />
            <Route path="payment-story" element={<PaymentStoryView />} />
            <Route path="doctor" element={<ConnectionDoctor />} />
            <Route path="settings" element={<div className="glass-panel p-8 rounded-2xl"><h1 className="text-2xl font-bold mb-4 font-display text-white">Configuración</h1><p className="text-slate-400">Gestión de contraseña en construcción.</p></div>} />
          </Route>

          <Route path="/staff" element={
            <ProtectedRoute role="staff">
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<StaffDashboard />} />
            <Route path="clients" element={<div className="p-8"><h1 className="text-2xl font-bold mb-4">Gestión de Clientes</h1><p>Próximamente</p></div>} />
            <Route path="network" element={<div className="p-8"><h1 className="text-2xl font-bold mb-4">Estado de Red</h1><p>Próximamente</p></div>} />
            <Route path="tools" element={<div className="p-8"><h1 className="text-2xl font-bold mb-4">Herramientas</h1><p>Próximamente</p></div>} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        }
      }} />
      <WhatsAppBubble />
    </Router>
  );
}

export default App;
