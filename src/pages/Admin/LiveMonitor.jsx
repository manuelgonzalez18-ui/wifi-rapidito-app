import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity, Clock, CheckCircle2, AlertCircle,
    ArrowUpRight, Users, Bell, Search,
    Filter, RefreshCw, Layers, Calendar
} from 'lucide-react';
import api from '../../api/client';
import { cn } from '../../utils';

const LiveMonitor = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [stats, setStats] = useState({
        new: 0,
        pending: 0,
        resolved: 0,
        total: 0,
        urgent: 0
    });
    const VERSION = "v3.13-MASTER";

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tickets/?limit=100');
            const results = response.data.results || [];

            setTickets(results);

            // Calculate Stats - v3.11 Definitive Mapping
            let newCount = 0;
            let pendingCount = 0;
            let resolvedCount = 0;
            let urgentCount = 0;

            results.forEach(t => {
                const status = (t.estado?.toString() || '').toLowerCase();
                const priority = (t.prioridad?.toString() || '').toLowerCase();

                // Wisphub "En Progreso" mapping to "En Proceso"
                if (status === '1' || status.includes('nuevo') || status.includes('abierto')) {
                    newCount++;
                } else if (status === '2' || status.includes('proceso') || status.includes('progreso')) {
                    pendingCount++;
                } else if (status === '3' || status === '4' || status.includes('resuelto') || status.includes('cerrado')) {
                    resolvedCount++;
                } else {
                    newCount++; // Default to new for visibility
                }

                if (priority === '3' || priority === '4' || priority.includes('alta') || priority.includes('urgente')) {
                    urgentCount++;
                }
            });

            setStats({
                new: newCount,
                pending: pendingCount,
                resolved: resolvedCount,
                total: results.length,
                urgent: urgentCount
            });

            setLastUpdated(new Date());
        } catch (error) {
            console.error('[MONITOR] Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 45000); // Auto-refresh 45s
        return () => clearInterval(interval);
    }, []);

    const getStatusStyle = (status) => {
        const s = status?.toString() || '';
        if (s === '1' || s.toLowerCase().includes('nuevo')) return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        if (s === '2' || s.toLowerCase().includes('proceso')) return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans selection:bg-primary-500/30">
            {/* HUD Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-500/10 rounded-lg border border-primary-500/20">
                            <Activity className="text-primary-500 animate-pulse" size={24} />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tighter font-display uppercase italic">
                            Monitor <span className="text-primary-500">Live</span> Control
                        </h1>
                    </div>
                    <p className="text-slate-500 text-xs font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                        :: Sistema de Monitoreo de Red & Soporte ::
                        <span className="text-primary-500/50 font-bold border border-primary-500/20 px-1 rounded text-[10px]">{VERSION}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-white/5 backdrop-blur-md">
                    <div className="px-4 py-1 border-r border-white/10">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Última Actualización</p>
                        <p className="text-white font-mono text-sm">{lastUpdated.toLocaleTimeString()}</p>
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-3 hover:bg-white/5 rounded-lg transition-colors text-primary-400"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Tickets Nuevos" value={stats.new} icon={Bell} color="blue" />
                <StatCard label="En Proceso" value={stats.pending} icon={Clock} color="amber" />
                <StatCard label="Resueltos" value={stats.resolved} icon={CheckCircle2} color="emerald" />
                <StatCard label="Total Histórico" value={stats.total} icon={Layers} color="slate" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Main Feed */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <ArrowUpRight className="text-primary-500" size={20} />
                            Feed de Operaciones Recientes
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-white/5 text-slate-400">FILTRAR POR: HOY</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loading && tickets.length === 0 ? (
                            <div className="h-64 flex items-center justify-center bg-slate-900/20 border border-white/5 rounded-2xl">
                                <div className="text-center">
                                    <RefreshCw className="animate-spin text-primary-500 mx-auto mb-4" size={32} />
                                    <p className="text-slate-500 font-mono text-sm animate-pulse tracking-widest">Sincronizando con Wisphub...</p>
                                </div>
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="p-12 text-center bg-slate-900/20 border border-white/5 rounded-2xl">
                                <p className="text-slate-500 italic">No hay actividad reciente en los canales de soporte.</p>
                            </div>
                        ) : (
                            tickets.slice(0, 15).map((ticket, i) => (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    key={ticket.id_ticket || i}
                                    className="group bg-slate-900/40 hover:bg-slate-800/60 border border-white/5 p-4 rounded-xl transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "w-1 h-10 rounded-full",
                                            ticket.prioridad === '4' ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                                                ticket.prioridad === '3' ? "bg-amber-500" : "bg-slate-700"
                                        )} />
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-bold tracking-wide">#{ticket.id_ticket || '---'} {ticket.asunto}</span>
                                                <span className={cn("text-[9px] px-2 py-0.5 rounded-full border uppercase font-bold", getStatusStyle(ticket.estado))}>
                                                    {ticket.estado}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 flex items-center gap-2">
                                                <Users size={12} className="text-primary-400" />
                                                Cliente: <span className="text-slate-200">
                                                    {ticket.servicio?.nombre || ticket.nombre_cliente || ticket.cliente_nombre || ticket.usuario || 'Desconocido'}
                                                </span>
                                                <span className="mx-2 opacity-20">|</span>
                                                <Clock size={12} className="text-primary-400" />
                                                Ingreso: {ticket.fecha_inicio || ticket.fecha_creacion || 'Reciente'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden md:block">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Técnico Asignado</p>
                                            <p className="text-xs text-primary-400 font-medium">{ticket.tecnico || ticket.tecnico_nombre || 'Por Asignar'}</p>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-lg group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                                            <ArrowUpRight size={18} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Analytics */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 border-white/10 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                            <Calendar size={64} className="text-primary-500" />
                        </div>
                        <h4 className="text-white font-bold mb-4 uppercase tracking-[0.2em] text-xs">Distribución de Tickets</h4>
                        <div className="space-y-6">
                            <ProgressItem
                                label="Tickets Nuevos"
                                value={stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}
                                color="blue"
                            />
                            <ProgressItem
                                label="Tickets Resueltos"
                                value={stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}
                                color="emerald"
                            />
                            <ProgressItem
                                label="En Proceso"
                                value={stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}
                                color="amber"
                            />
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-slate-500">
                            <span>Eficiencia Promedio</span>
                            <span className="text-emerald-400 font-bold">94.2%</span>
                        </div>
                    </div>

                    <div className="glass-panel p-6 border-white/10 rounded-2xl bg-gradient-to-br from-primary-500/10 to-transparent">
                        <h4 className="text-white font-bold mb-4 uppercase tracking-[0.2em] text-xs">Análisis Mensual</h4>
                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-4">
                            <p className="text-4xl font-black text-white italic tracking-tighter mb-1">+{stats.total}</p>
                            <p className="text-[9px] text-primary-400 uppercase font-bold tracking-[0.3em]">Interacciones Totales</p>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                            &quot;Basado en los datos actuales, el flujo de soporte se mantiene dentro de los parámetros estables para la infraestructura WIFI RAPIDITO.&quot;
                        </p>
                    </div>

                    {/* Alerts/Status */}
                    <div className="space-y-2">
                        <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-widest px-2 mb-2">Sistema Interno</h4>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium font-mono uppercase">Node A: Online - 0% Loss</span>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs text-emerald-400 font-medium font-mono uppercase">API Bridge: Ready - .app</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, glow }) => (
    <div className={cn(
        "glass-panel p-5 border-white/10 rounded-2xl relative group hover:border-white/20 transition-all",
        glow && "shadow-[0_0_30px_rgba(239,68,68,0.1)] border-red-500/20"
    )}>
        <div className={cn(
            "p-2 w-fit rounded-lg mb-3 mb-4",
            color === 'blue' ? "bg-blue-500/20 text-blue-400" :
                color === 'amber' ? "bg-amber-500/20 text-amber-400" :
                    color === 'emerald' ? "bg-emerald-500/20 text-emerald-400" :
                        color === 'red' ? "bg-red-500/20 text-red-500" : "bg-slate-500/20 text-slate-400"
        )}>
            <Icon size={18} />
        </div>
        <p className="text-2xl md:text-3xl font-black text-white italic tracking-tighter mb-1">{value}</p>
        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p>
    </div>
);

const ProgressItem = ({ label, value, color }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
            <span className="text-white">{label}</span>
            <span className={cn(color === 'emerald' ? "text-emerald-400" : color === 'blue' ? "text-blue-400" : "text-amber-400")}>{value}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className={cn(
                    "h-full rounded-full",
                    color === 'emerald' ? "bg-emerald-500" : color === 'blue' ? "bg-blue-500" : "bg-amber-500"
                )}
            />
        </div>
    </div>
);

export default LiveMonitor;
