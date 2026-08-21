import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import useAuthStore from '../auth/authStore';
import MobileNav from '../components/layout/MobileNav';

const DashboardLayout = () => {
    const { user } = useAuthStore();
    const role = user?.role || 'client';

    return (
        <div className="min-h-screen bg-[#050b14] text-slate-100">
            <Sidebar role={role} />
            <main className="min-h-screen md:ml-64">
                <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 md:px-8 md:pb-10 md:pt-8">
                    <Outlet />
                </div>
            </main>
            <MobileNav />
        </div>
    );
};

export default DashboardLayout;
