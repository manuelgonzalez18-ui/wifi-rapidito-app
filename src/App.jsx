import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from './pages/Login';
import ClientDashboard from './pages/Client/Dashboard';
import StaffDashboard from './pages/Staff/Dashboard';
import DashboardLayout from './layouts/DashboardLayout';
import useAuthStore from './auth/authStore';

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
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/client" element={
            <ProtectedRoute role="client">
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<ClientDashboard />} />
            <Route path="payments" element={<div className="glass-panel p-8 rounded-2xl"><h1 className="text-2xl font-bold mb-4 font-display text-white">Reportar Pagos</h1><p className="text-slate-400">Módulo de pagos en construcción.</p></div>} />
            <Route path="invoices" element={<div className="glass-panel p-8 rounded-2xl"><h1 className="text-2xl font-bold mb-4 font-display text-white">Facturas</h1><p className="text-slate-400">Historial de facturación en construcción.</p></div>} />
            <Route path="support" element={<div className="glass-panel p-8 rounded-2xl"><h1 className="text-2xl font-bold mb-4 font-display text-white">Soporte Técnico</h1><p className="text-slate-400">Sistema de tickets en construcción.</p></div>} />
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
    </Router>
  );
}

export default App;
