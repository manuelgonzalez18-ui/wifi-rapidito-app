import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Wifi, User, LayoutDashboard, CreditCard, LifeBuoy, Users, Activity, Settings, FileText } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import { cn } from '../../utils';

const NavItem = ({ icon: Icon, label, to, active }) => {
    return (
        <Link to={to} className="relative block group px-3 py-1">
            {active && (
                <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary-500/10 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
            )}
            <div className={cn(
                "flex items-center gap-4 px-4 py-3 transition-all duration-300 rounded-xl",
                active ? "text-white font-bold" : "text-slate-400 group-hover:text-white group-hover:bg-white/5"
            )}>
                <Icon size={20} className={cn(active ? "text-primary-400 drop-shadow-[0_0_8px_rgba(50,250,255,0.5)]" : "text-slate-500 group-hover:text-primary-400 transition-colors")} />
                <span className="tracking-wide text-sm">{label}</span>
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
        { icon: FileText, label: 'Facturas', to: '/client/invoices' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
        { icon: Settings, label: 'Configuración', to: '/client/settings' },
    ];

    const staffLinks = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/staff' },
        { icon: Users, label: 'Clientes', to: '/staff/clients' },
        { icon: Activity, label: 'Red', to: '/staff/network' },
        { icon: Settings, label: 'Herramientas', to: '/staff/tools' },
    ];

    const links = role === 'staff' ? staffLinks : clientLinks;

    return (
        <aside className="fixed left-0 top-0 h-full w-64 glass-panel border-r border-white/10 z-40 hidden md:flex flex-col bg-[#020617]/80 backdrop-blur-md">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                    <Wifi className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-white text-lg leading-tight tracking-wide">Wifi Rapidito</h1>
                    <span className="text-[10px] text-primary-400 font-bold tracking-[0.2em] uppercase">Panel de Control</span>
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

            <div className="p-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                        <User size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{user?.name || 'Usuario'}</p>
                        <p className="text-xs text-slate-400 truncate capitalize font-medium">{role === 'client' ? 'Cliente' : 'Administrador'}</p>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-all duration-200 text-sm font-bold group border border-transparent hover:border-red-500/20"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
