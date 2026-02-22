import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CreditCard, FileText, LifeBuoy, User, Handshake, CheckSquare } from 'lucide-react';

const MobileNav = () => {
    const navItems = [
        { icon: LayoutDashboard, label: 'Inicio', to: '/client' },
        { icon: CreditCard, label: 'Pago', to: '/client/payments' },
        { icon: Handshake, label: 'Promesa', to: '/client/request-promise' },
        { icon: CheckSquare, label: 'Reporte', to: '/client/confirm-payment' },
        { icon: FileText, label: 'Docs', to: '/client/invoices' },
        { icon: LifeBuoy, label: 'Soporte', to: '/client/support' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 p-1 md:hidden z-50">
            <div className="flex justify-between items-center px-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        end={item.to === '/client'}
                        className={({ isActive }) => `
                            flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all flex-1
                            ${isActive ? 'text-primary-400 bg-white/5' : 'text-slate-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : ''} />
                                <span className="text-[9px] font-medium leading-tight text-center">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default MobileNav;
