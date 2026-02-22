import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp, TrendingDown, DollarSign, PieChart,
    BarChart3, Calendar, Filter, RefreshCw, AlertCircle,
    ArrowUpRight, ArrowDownRight, Activity, Wallet, Shield
} from 'lucide-react';
import axios from 'axios';

// Componente de Tarjeta de Métrica (Reutilizando el estilo del proyecto)
const StatCard = ({ label, value, trend, icon: Icon, colorClass, delay }) => (
    <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
        className="glass-panel p-6 border border-white/10 hover:border-cyan-500/30 transition-all group overflow-hidden relative"
    >
        <div className={`absolute -right-4 -top-4 w-24 h-24 opacity-10 blur-2xl rounded-full ${colorClass.split(' ')[0] === 'text-green-400' ? 'bg-green-500' : 'bg-cyan-500'}`} />

        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={`p-3 rounded-lg bg-white/5 border border-white/10 ${colorClass}`}>
                <Icon className="w-6 h-6" />
            </div>
            {trend && (
                <div className={`flex items-center text-xs font-bold ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>

        <div className="relative z-10">
            <h3 className="text-3xl font-bold text-white mb-1 tracking-tighter">${value}</h3>
            <p className="text-white/50 text-xs uppercase tracking-widest font-bold">{label}</p>
        </div>
    </motion.div>
);

// Mini Gráfico de Barras Custom CSS
const SimpleBarChart = ({ data, title }) => {
    const maxVal = Math.max(...Object.values(data).map(d => d.income + d.others + d.expenses), 1);

    return (
        <div className="glass-panel p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                {title}
            </h3>
            <div className="flex items-end justify-between h-48 gap-2">
                {Object.entries(data).map(([month, vals], i) => (
                    <div key={month} className="flex-1 flex flex-col items-center group">
                        <div className="relative w-full flex flex-col justify-end h-32 gap-0.5">
                            {/* Pendientes/Expenses (Redish) */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(vals.expenses / maxVal) * 100}%` }}
                                className="w-full bg-red-500/40 border-t border-red-500/50"
                            />
                            {/* Otros Ingresos (Cyan) */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(vals.others / maxVal) * 100}%` }}
                                className="w-full bg-cyan-500/40 border-t border-cyan-500/50"
                            />
                            {/* Ingresos Internet (Green) */}
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${(vals.income / maxVal) * 100}%` }}
                                className="w-full bg-green-500/40 border-t border-green-500/50"
                            />

                            {/* Tooltip simple */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-slate-900 border border-white/20 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                <p className="text-green-400">Neto: ${vals.income.toFixed(2)}</p>
                                <p className="text-cyan-400">Otros: ${vals.others.toFixed(2)}</p>
                                <p className="text-red-400">Gastos: ${vals.expenses.toFixed(2)}</p>
                            </div>
                        </div>
                        <span className="text-[10px] text-white/40 mt-3 font-bold uppercase tracking-tighter">{month}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 flex justify-center gap-4 border-t border-white/5 pt-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase">
                    <div className="w-2 h-2 bg-green-500/60" /> Internet
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase">
                    <div className="w-2 h-2 bg-cyan-500/60" /> Otros
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/50 uppercase">
                    <div className="w-2 h-2 bg-red-500/60" /> Gastos
                </div>
            </div>
        </div>
    );
};

const FinanceDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/finance_proxy.php');
            if (response.data.status === 'success') {
                setStats(response.data.data);
            } else {
                setError("No se pudieron cargar las finanzas.");
            }
        } catch (err) {
            setError("Error de conexión con el proxy financiero.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                <p className="text-cyan-400/50 font-mono tracking-widest text-xs uppercase animate-pulse">Analizando Registros Financieros...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">ACCESS ERROR</h3>
                <p className="text-white/50 mb-6">{error}</p>
                <button onClick={fetchFinanceData} className="px-6 py-2 bg-white/5 border border-white/20 text-white rounded hover:bg-white/10">Reintentar</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-white font-display tracking-tight uppercase">
                        Finanzas <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">Live</span>
                    </h1>
                    <p className="text-white/30 text-xs font-mono tracking-[0.3em] uppercase mt-1">:: Intelligence Dashboard v2.0 ::</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-[10px] text-white/60 font-bold uppercase tracking-widest">
                        <Calendar className="w-3 h-3" />
                        AÑO {new Date().getFullYear()}
                    </div>
                    <button onClick={fetchFinanceData} className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-all">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    label="Ingresos Internet"
                    value={stats.summary.total_internet.toLocaleString()}
                    trend={12.5}
                    icon={Activity}
                    colorClass="text-green-400"
                    delay={0.1}
                />
                <StatCard
                    label="Otros Ingresos"
                    value={stats.summary.total_others.toLocaleString()}
                    icon={DollarSign}
                    colorClass="text-cyan-400"
                    delay={0.2}
                />
                <StatCard
                    label="Cobranza Pendiente"
                    value={stats.summary.total_pending.toLocaleString()}
                    icon={Wallet}
                    colorClass="text-amber-400"
                    delay={0.3}
                />
                <StatCard
                    label="Gastos Operativos"
                    value={stats.summary.total_expenses.toLocaleString()}
                    icon={TrendingDown}
                    colorClass="text-red-400"
                    delay={0.4}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <SimpleBarChart data={stats.history} title="HISTORIAL FINANCIERO MENSUAL" />
                </div>

                <div className="glass-panel p-6 border border-white/10 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-purple-400" />
                        DISTRIBUCIÓN DE CAJA
                    </h3>

                    <div className="flex-1 flex flex-col justify-center gap-6">
                        {[
                            { name: 'Suscripciones', val: stats.summary.total_internet, color: 'bg-green-500' },
                            { name: 'Equipos/Extras', val: stats.summary.total_others, color: 'bg-cyan-500' },
                            { name: 'Por Cobrar', val: stats.summary.total_pending, color: 'bg-amber-500' }
                        ].map((item, i) => {
                            const total = stats.summary.total_internet + stats.summary.total_others + stats.summary.total_pending;
                            const pct = ((item.val / total) * 100).toFixed(1);

                            return (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex justify-between text-[11px] font-bold uppercase">
                                        <span className="text-white/60">{item.name}</span>
                                        <span className="text-white">{pct}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ delay: 0.5 + (i * 0.1) }}
                                            className={`h-full ${item.color}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-[10px] text-white/40 font-bold uppercase mb-1">Total Movimiento Anual</p>
                        <p className="text-2xl font-bold text-white">${(stats.summary.total_internet + stats.summary.total_others).toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Footer Alert */}
            <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl flex items-center gap-4">
                <div className="p-2 bg-cyan-500/20 rounded-full">
                    <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-xs text-cyan-200/70 leading-relaxed">
                    <strong>NOTA DE SEGURIDAD:</strong> Este panel es de uso estrictamente privado. Los datos mostrados tienen un retraso máximo de 15 minutos debido a la caché de sincronización con Wisphub.
                </p>
            </div>
        </div>
    );
};

export default FinanceDashboard;
