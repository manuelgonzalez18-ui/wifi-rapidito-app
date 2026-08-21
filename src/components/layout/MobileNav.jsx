import { NavLink, useLocation } from 'react-router-dom';
import { Home, FileText, CreditCard, LifeBuoy, Handshake } from 'lucide-react';
import useAuthStore from '../../auth/authStore';

const MobileNav = () => {
    const { user } = useAuthStore();
    const location = useLocation();

    if (user?.role === 'staff') return null;

    const navItems = [
        { icon: Home, label: 'Inicio', to: '/client' },
        { icon: FileText, label: 'Facturas', to: '/client/invoices' },
        { icon: CreditCard, label: 'Pagos', to: '/client/payments' },
        { icon: Handshake, label: 'Promesa', to: '/client/request-promise' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
    ];

    return (
        <nav
            aria-label="Navegación principal"
            className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#07101d]/95 px-2 pt-2 backdrop-blur-2xl md:hidden safe-bottom"
        >
            <div className="mx-auto flex max-w-lg items-stretch justify-between gap-1">
                {navItems.map((item) => {
                    const isActive = item.to === '/client'
                        ? location.pathname === '/client'
                        : location.pathname.startsWith(item.to);

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/client'}
                            aria-label={item.label}
                            className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition ${
                                isActive ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-200'
                            }`}
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
