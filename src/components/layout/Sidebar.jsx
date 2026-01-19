import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Wifi, User, LayoutDashboard, CreditCard, LifeBuoy, Users, Activity, Settings } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import { cn } from '../../utils';

const NavItem = ({ icon: Icon, label, to, active }) => {
    return (
        <Link to={to} className="relative block group">
            {active && (
                <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary-600/10 border-r-4 border-primary-600 rounded-r-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <div className={cn(
                "flex items-center gap-4 px-6 py-3.5 transition-colors",
                active ? "text-primary-600 font-medium" : "text-slate-500 hover:text-slate-800"
            )}>
                <Icon size={20} className={cn(active ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span>{label}</span>
            </div>
        </Link>
    );
};

const Sidebar = ({ role }) => {
    const location = useLocation();
    const { logout, user } = useAuthStore();

    const clientLinks = [
        { icon: LayoutDashboard, label: 'Resumen', to: '/client' },
        { icon: CreditCard, label: 'Pagos', to: '/client/payments' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
    ];

    const staffLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/staff' },
        { icon: Users, label: 'Clientes', to: '/staff/clients' },
        { icon: Activity, label: 'Red', to: '/staff/network' },
        { icon: Settings, label: 'Herramientas', to: '/staff/tools' },
    ];

    const links = role === 'staff' ? staffLinks : clientLinks;

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200 z-40 hidden md:flex flex-col">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Wifi className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-slate-800 text-lg leading-tight">Wifi Rapidito</h1>
                    <span className="text-xs text-slate-500 font-medium tracking-wide">PANEL DE CONTROL</span>
                </div>
            </div>

            <div className="flex-1 py-6 space-y-1 overflow-y-auto">
                {links.map((link) => (
                    <NavItem
                        key={link.to}
                        {...link}
                        active={location.pathname === link.to}
                    />
                ))}
            </div>

            <div className="p-6 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                        <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Usuario'}</p>
                        <p className="text-xs text-slate-500 truncate capitalize">{role}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
