import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import useAuthStore from '../auth/authStore';
import MobileNav from '../components/layout/MobileNav';

const DashboardLayout = () => {
    const { user, logout } = useAuthStore();
    const role = user?.role || 'client';

    return (
        <div className="min-h-screen bg-[#050b14] text-slate-100">
            <Sidebar role={role} />
            <main className="min-h-screen md:ml-64">
                <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pb-10 md:pt-8">
                    <div className="mb-4 flex items-center justify-end md:hidden">
                        <button
                            type="button"
                            onClick={logout}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition active:scale-[0.98]"
                            aria-label="Cerrar sesión"
                        >
                            <LogOut size={18} />
                            Cerrar sesión
                        </button>
                    </div>
                    <Outlet />
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default DashboardLayout;
