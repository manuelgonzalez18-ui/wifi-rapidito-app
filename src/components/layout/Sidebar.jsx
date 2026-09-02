import { createElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LogOut, Wifi, User, LayoutDashboard, CreditCard,
    LifeBuoy, Users, Activity, Settings, FileText, Handshake, KeyRound, ShieldOff
} from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import { cn } from '../../utils';

const NavItem = ({ icon, label, to, active }) => (
    <Link to={to} className="relative block px-3 py-1 group">
        {active ? <div className="absolute inset-1 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.07]" /> : null}
        <div className={cn(
            'relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors',
            active ? 'font-semibold text-white' : 'text-slate-400 group-hover:bg-white/[0.04] group-hover:text-white'
        )}>
            {createElement(icon, { size: 19, className: cn(active ? 'text-cyan-300' : 'text-slate-500 group-hover:text-cyan-300') })}
            <span>{label}</span>
        </div>
    </Link>
);

const can = (user, permission) => {
    if (!permission) return true;
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return permissions.includes('*') || permissions.includes(permission);
};

const Sidebar = ({ role }) => {
    const location = useLocation();
    const { logout, user } = useAuthStore();

    const clientLinks = [
        { icon: LayoutDashboard, label: 'Inicio', to: '/client' },
        { icon: FileText, label: 'Facturas', to: '/client/invoices' },
        { icon: CreditCard, label: 'Reportar pago', to: '/client/payments' },
        { icon: Handshake, label: 'Promesa de pago', to: '/client/request-promise' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
        { icon: Settings, label: 'Configuración', to: '/client/settings' },
    ];

    // Keep the finance payment history visible in the staff desktop navigation.
    const staffLinks = [
        { icon: LayoutDashboard, label: 'Resumen', to: '/staff' },
        { icon: CreditCard, label: 'Pagos automáticos', to: '/staff/payments', permission: 'finance' },
        { icon: LifeBuoy, label: 'Soporte técnico', to: '/staff/support', permission: 'support' },
        { icon: ShieldOff, label: 'Restricciones promesas', to: '/staff/promise-restrictions', permission: 'manage_staff' },
        { icon: KeyRound, label: 'Accesos del personal', to: '/staff/access', permission: 'manage_staff' },
        { icon: Users, label: 'Clientes', to: '/staff/clients', permission: 'manage_staff' },
        { icon: Activity, label: 'Estado de red', to: '/staff/network', permission: 'network' },
        { icon: Settings, label: 'Herramientas', to: '/staff/tools', permission: 'manage_staff' },
    ];

    const links = role === 'staff' ? staffLinks.filter((link) => can(user, link.permission)) : clientLinks;
    const isActive = (to) => ['/client', '/staff'].includes(to)
        ? location.pathname === to
        : location.pathname === to || location.pathname.startsWith(`${to}/`);

    return (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/8 bg-[#06101d]/90 backdrop-blur-xl md:flex">
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300"><Wifi className="h-5 w-5" /></div>
                <div className="min-w-0">
                    <h1 className="truncate text-base font-bold text-white">Wifi Rapidito</h1>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{role === 'staff' ? 'Operaciones' : 'Autogestión'}</p>
                </div>
            </div>

            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Navegación</div>
            <div className="flex-1 space-y-0.5 overflow-y-auto pb-4">
                {links.map((link) => <NavItem key={link.to} {...link} active={isActive(link.to)} />)}
            </div>

            <div className="border-t border-white/8 p-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-slate-300"><User size={18} /></div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{user?.nombre || user?.name || 'Usuario'}</p>
                        <p className="truncate text-xs text-slate-500">{role === 'client' ? 'Cliente' : (user?.staff_profile ? user.staff_profile.replace('_', ' ') : 'Personal autorizado')}</p>
                    </div>
                </div>

                <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-400 transition hover:bg-red-500/10 hover:text-red-300">
                    <LogOut size={18} /> Cerrar sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
