import { motion } from 'framer-motion';
import {
    Wifi, ArrowUp, ArrowDown, Calendar, CreditCard,
    CheckCircle, AlertCircle, FileText, Activity,
    MessageSquare, Shield, Clock, TrendingUp
} from 'lucide-react';
import Card from '../../components/ui/Card';
import useAuthStore from '../../auth/authStore';

// Premium KPI Card Component
const KpiCard = ({ label, value, subtext, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="relative overflow-hidden group"
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-${color.replace('text-', '')}`} />
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative z-10 hover:border-white/20 transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl bg-white/5 ${color} shadow-[0_0_15px_rgba(0,0,0,0.3)]`}>
                    <Icon className="w-6 h-6" />
                </div>
                {subtext && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-full border border-white/5">
                        {subtext}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-3xl font-bold text-white mb-1 tracking-tight font-display">{value}</h3>
                <p className="text-slate-400 text-sm font-medium tracking-wide">{label}</p>
            </div>
        </div>
    </motion.div>
);

const ClientDashboard = () => {
    const { user } = useAuthStore();

    // Mock data for new requirements (fallback if not in user object)
    // In a real scenario, these would come from separate API calls (invoices, tickets)
    const stats = {
        serviceStatus: 'Activo',
        plan: user?.plan || 'Plan Premium',
        balance: user?.balance || '0.00',
        totalToPay: parseFloat(user?.balance || 0) > 0 ? user?.balance : '0.00',
        paidInvoices: 12, // Mock
        pendingInvoices: parseFloat(user?.balance || 0) > 0 ? 1 : 0,
        resolvedTickets: 5, // Mock
        pendingTickets: 0, // Mock
        nextPayment: '15 Feb 2026'
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-4xl font-bold text-white font-display tracking-tight">
                        Hola, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">{user?.name?.split(' ')[0]}</span>
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">Bienvenido a tu panel de control futurista.</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-5 py-2 glass-panel border border-green-500/30 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                >
                    <div className="relative">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-50" />
                    </div>
                    <span className="text-green-400 font-bold tracking-wider text-sm">SISTEMA ONLINE</span>
                </motion.div>
            </div>

            {/* Primary KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    label="Saldo Pendiente"
                    value={`$${stats.balance}`}
                    icon={CreditCard}
                    color="text-secondary-400"
                    subtext="TOTAL"
                    delay={0.1}
                />
                <KpiCard
                    label="Próximo Pago"
                    value={stats.nextPayment.split(' ').slice(0, 2).join(' ')}
                    icon={Calendar}
                    color="text-primary-400"
                    subtext="Vence"
                    delay={0.2}
                />
                <KpiCard
                    label="Consumo Hoy"
                    value="2.4 GB"
                    icon={Activity}
                    color="text-emerald-400"
                    subtext="ALTA VELOCIDAD"
                    delay={0.3}
                />
                <KpiCard
                    label="Tickets Activos"
                    value={stats.pendingTickets}
                    icon={MessageSquare}
                    color="text-amber-400"
                    subtext="SOPORTE"
                    delay={0.4}
                />
            </div>

            {/* Detailed Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Real-time Consumption Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 glass-panel rounded-3xl border border-white/5 p-8 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                        <Wifi className="w-32 h-32 text-primary-500" />
                    </div>

                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary-400" />
                                Consumo en Tiempo Real
                            </h3>
                            <p className="text-slate-400 text-sm">Monitoreo de tráfico en vivo</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Bajada</p>
                                <p className="text-emerald-400 font-bold font-mono text-lg flex items-center justify-end gap-1">
                                    <ArrowDown className="w-4 h-4" /> 15 Mbps
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Subida</p>
                                <p className="text-sky-400 font-bold font-mono text-lg flex items-center justify-end gap-1">
                                    <ArrowUp className="w-4 h-4" /> 5 Mbps
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CSS/SVG Futuristic Chart */}
                    <div className="h-64 w-full bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden flex items-end px-2 gap-1 backdrop-blur-sm">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />

                        {/* Animated Bars */}
                        {[...Array(30)].map((_, i) => {
                            const height = Math.floor(Math.random() * 80) + 10;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ height: '5%' }}
                                    animate={{
                                        height: [`${height}%`, `${Math.max(10, height + (Math.random() * 40 - 20))}%`, `${height}%`],
                                        opacity: [0.3, 0.8, 0.3]
                                    }}
                                    transition={{
                                        duration: 2 + Math.random(),
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="flex-1 bg-gradient-to-t from-primary-600/50 to-primary-400/80 rounded-t-sm shadow-[0_0_10px_rgba(56,189,248,0.3)] relative group"
                                >
                                    <div className="absolute top-0 w-full h-1 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Secondary Stats / Quick Actions */}
                <div className="space-y-6">
                    {/* Invoice Summary */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        className="glass-panel rounded-2xl p-6 border border-white/5"
                    >
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-secondary-400" />
                            Facturación
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-slate-400 text-sm">Pagadas</span>
                                <span className="text-green-400 font-bold">{stats.paidInvoices}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                                <span className="text-slate-400 text-sm">Pendientes</span>
                                <span className="text-amber-400 font-bold">{stats.pendingInvoices}</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10">
                                <button className="w-full py-2 bg-gradient-to-r from-secondary-600 to-secondary-500 hover:from-secondary-500 hover:to-secondary-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-secondary-500/20 transition-all">
                                    Reportar Pago
                                </button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Ticket Summary */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="glass-panel rounded-2xl p-6 border border-white/5"
                    >
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-400" />
                            Soporte Técnico
                        </h3>
                        <div className="flex gap-4">
                            <div className="flex-1 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                <p className="text-2xl font-bold text-indigo-400">{stats.resolvedTickets}</p>
                                <p className="text-[10px] text-indigo-300 uppercase tracking-wide">Resueltos</p>
                            </div>
                            <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                <p className="text-2xl font-bold text-amber-400">{stats.pendingTickets}</p>
                                <p className="text-[10px] text-amber-300 uppercase tracking-wide">Pendientes</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm border border-white/10 transition-all">
                                Crear Nuevo Ticket
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;
