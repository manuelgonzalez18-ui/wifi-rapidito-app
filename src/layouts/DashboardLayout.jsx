import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import useAuthStore from '../auth/authStore';

const DashboardLayout = () => {
    const { user } = useAuthStore();

    // Fallback role if user is null (should normally be handled by Redirect)
    const role = user?.role || 'client';

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar role={role} />
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen relative">
                {/* Background Decor */}
                <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary-100/50 rounded-full blur-[100px] -z-10 pointer-events-none" />
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
