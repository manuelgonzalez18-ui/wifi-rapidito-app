import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, CreditCard, LifeBuoy, Handshake, Activity, Settings, KeyRound, ShieldOff } from 'lucide-react';
import useAuthStore from '../../auth/authStore';

const can = (user, permission) => {
    if (!permission) return true;
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return permissions.includes('*') || permissions.includes(permission);
};

const MobileNav = () => {
    const { user } = useAuthStore();
    const location = useLocation();

    const clientItems = [
        { icon: Home, label: 'Inicio', to: '/client' },
        { icon: FileText, label: 'Facturas', to: '/client/invoices' },
        { icon: CreditCard, label: 'Pagos', to: '/client/payments' },
        { icon: Handshake, label: 'Promesa', to: '/client/request-promise' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
    ];

    const staffItems = [
        { icon: Home, label: 'Resumen', to: '/staff' },
        { icon: CreditCard, label: 'Pagos', to: '/staff/payments', permission: 'finance' },
        { icon: LifeBuoy, label: 'Soporte', to: '/staff/support', permission: 'support' },
        { icon: ShieldOff, label: 'Promesas', to: '/staff/promise-restrictions', permission: 'manage_staff' },
        { icon: KeyRound, label: 'Accesos', to: '/staff/access', permission: 'manage_staff' },
        { icon: Activity, label: 'Red', to: '/staff/network', permission: 'network' },
        { icon: Settings, label: 'Tools', to: '/staff/tools', permission: 'manage_staff' },
    ];

    const navItems = user?.role === 'staff'
        ? staffItems.filter((item) => can(user, item.permission))
        : clientItems;

    return (
        <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07101d]/95 px-2 pt-2 backdrop-blur-2xl md:hidden safe-bottom">
            <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1 overflow-x-auto">
                {navItems.map((item) => {
                    const isRoot = ['/client', '/staff'].includes(item.to);
                    const isActive = isRoot
                        ? location.pathname === item.to
                        : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={isRoot}
                            aria-label={item.label}
                            className={`relative flex min-h-14 min-w-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition ${isActive ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-200'}`}
                        >
                            {isActive ? <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-cyan-400" /> : null}
                            <item.icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileNav;
