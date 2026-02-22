import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Wifi, ArrowUp, ArrowDown, Calendar, CreditCard,
    CheckCircle, AlertCircle, FileText, Activity,
    MessageSquare, Shield, Clock, TrendingUp, Download, Send,
    Handshake, CheckSquare
} from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import api from '../../api/client';
import notificationService from '../../services/notificationService';
import DebugPanel from '../../components/ui/DebugPanel';

const KpiCard = ({ label, value, subtext, icon: Icon, colorText, colorBg, delay }) => (
    <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="relative overflow-hidden group"
    >
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${colorBg}`} />
        <div className="glass-panel p-6 border border-cyan-500/20 relative z-10 hover:border-cyan-400/50 transition-all duration-300 backdrop-blur-md">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 ${colorText} bg-cyan-950/30 border border-cyan-500/10 shadow-[0_0_15px_rgba(0,243,255,0.1)]`}>
                    <Icon className="w-6 h-6" />
                </div>
                {subtext && (
                    <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-300 bg-cyan-950/30 px-2 py-1 border border-cyan-500/20">
                        {subtext}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-3xl font-bold text-white mb-1 tracking-tighter font-display drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">{value}</h3>
                <p className="text-cyan-200/70 text-sm font-medium tracking-wide uppercase">{label}</p>
            </div>
        </div>
    </motion.div>
);

const ClientDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const getDisplayName = () => {
        const rawName = user?.name || user?.nombre || 'Cliente';
        if (rawName.includes('MODO DEMO')) return rawName;
        return rawName.split(' ')[0];
    };
    const firstName = getDisplayName();
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [recentTickets, setRecentTickets] = useState([]);
    const [promiseDate, setPromiseDate] = useState(null);
    const [stats, setStats] = useState({ total: 0, rejected: 0 });
    const [firstRejected, setFirstRejected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [promiseError, setPromiseError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            console.log('Dashboard: Fetching Data', user);

            // Request permission on first load
            notificationService.requestPermission();

            if (!user?.cedula && !user?.id_cliente && !user?.id_servicio) {
                setLoading(false);
                return;
            }

            try {
                // TARGETED QUERY: Search by multiple potential ID fields
                const invoiceQueries = [
                    api.get(`/facturas/?cliente=${user.usuario}&limit=50`),
                    api.get(`/facturas/?search=${user.cedula}&limit=50`),
                    api.get(`/facturas/?id_servicio=${user.id_servicio}&limit=50`),
                    api.get(`/facturas/?id_cliente=${user.id_cliente}&limit=50`),
                    api.get(`/facturas/?servicio=${user.id_servicio}&limit=50`), // Variation
                    api.get(`/facturas/?cedula=${user.cedula}&limit=50`)    // Variation
                ];

                const [responses, tRes, pRes] = await Promise.all([
                    Promise.allSettled(invoiceQueries),
                    api.get(`/tickets/?servicio=${user.id_servicio}`).catch(() => ({ data: { results: [] } })),
                    api.get(`/promesas-de-pago/?cliente=${user.id_servicio}`).catch(err => {
                        if (err.response?.status === 403) {
                            setPromiseError("Permission Denied: Promesas de Pago");
                        }
                        return { data: { results: [] } };
                    })
                ]);

                let allInvoices = [];
                responses.forEach(res => {
                    if (res.status === 'fulfilled') {
                        const items = res.value.data?.results || res.value.data || [];
                        if (Array.isArray(items)) allInvoices.push(...items);
                    }
                });

                if (!Array.isArray(allInvoices)) allInvoices = [];

                // Init Loop Variables
                let localStats = { total: 0, rejected: 0 };
                let firstRejectedItem = null;

                // Robust filtering to ensure only current user's data is shown
                const uniqueMap = new Map();

                allInvoices.forEach(item => {
                    const id = item.id_factura || item.id || item.folio;
                    if (id) {
                        localStats.total++;
                        // UNIVERSAL ID MATCHER (v1.9.14)
                        const userCandidates = [
                            user.id_servicio,
                            user.id_cliente,
                            user.cedula,
                            user.usuario,
                            user.usuario_portal
                        ].filter(x => x).map(String);

                        // Deep Candidate Extraction
                        const getVal = (v) => (v && typeof v === 'object') ? (v.id || v.id_servicio || v.id_cliente) : v;

                        // We check the item itself and the nested cliente/servicio objects
                        const itemCandidates = [
                            String(item.id_servicio || ''),
                            String(item.id_cliente || ''),
                            String(item.cliente_id || ''),
                            String(item.servicio_id || ''),
                            String(item.cedula || ''),
                            String(getVal(item.cliente) || ''),
                            String(getVal(item.servicio) || ''),
                            String(item.cliente?.cedula || ''),
                            String(item.cliente?.id_cliente || ''),
                            String(item.cliente?.usuario || ''),
                            String(item.servicio?.id_servicio || ''),
                            // NEW: Extract from articulos
                            ...(item.articulos || []).map(art => String(art.servicio?.id_servicio || ''))
                        ].filter(x => x && x !== 'undefined' && x !== 'null');

                        // Check intersection
                        let isMine = userCandidates.some(uId => itemCandidates.includes(uId));

                        // NUCLEAR FALLBACK (v1.9.5)
                        if (!isMine && user.id_cliente) {
                            const jsonStr = JSON.stringify(item);
                            if (jsonStr.includes(`"${user.id_cliente}"`) || jsonStr.includes(`:${user.id_cliente}`)) {
                                isMine = true;
                            }
                        }

                        if (isMine) {
                            uniqueMap.set(id, item);
                        } else {
                            localStats.rejected++;
                            if (!firstRejectedItem) {
                                firstRejectedItem = JSON.parse(JSON.stringify(item));
                            }
                        }
                    }
                });

                setStats(localStats);
                setFirstRejected(firstRejectedItem);

                let myInvoices = Array.from(uniqueMap.values())
                    .sort((a, b) => (b.id_factura || b.id || 0) - (a.id_factura || a.id || 0))
                    .slice(0, 5);

                // SAFETY NET REMOVED (v1.9.9-SECURE) - Incorrect data reported.
                // We revert to strict display.

                // SAFETY NET REMOVED (v1.9.9-SECURE) - Incorrect data reported.
                // We revert to strict display.

                setRecentInvoices(myInvoices);

                let fetchedTickets = tRes.data?.results || tRes.data || [];
                if (!Array.isArray(fetchedTickets)) fetchedTickets = [];

                // Extra local filter for tickets safety
                const myTickets = fetchedTickets.filter(t => {
                    // Fix: Check nested service object
                    const tServiceId = String(t.id_servicio || t.servicio?.id_servicio || t.servicio || '');
                    return tServiceId === String(user.id_servicio) ||
                        JSON.stringify(t).toLowerCase().includes(String(user.cedula || '').toLowerCase());
                });

                setRecentTickets(myTickets.slice(0, 5));

                // --- PROMISE HANDLING (Improved v1.16.0) ---
                let activePromiseDate = null;

                // 1. Try injected promise from login (Most Reliable)
                if (user.promesa_pago && (user.promesa_pago.fecha_limite_de_pago || user.promesa_pago.fecha_limite)) {
                    activePromiseDate = user.promesa_pago.fecha_limite_de_pago || user.promesa_pago.fecha_limite;
                }
                // 2. Fallback to API fetch
                else {
                    let fetchedPromises = pRes.data?.results || pRes.data || [];
                    if (!Array.isArray(fetchedPromises)) fetchedPromises = [];

                    // Match by any relevant identifier (v1.16.2 - Normalized)
                    const normalizeId = (id) => String(id || '').trim().replace(/^0+/, '');
                    const myInvoiceIdsNorm = myInvoices.map(inv => normalizeId(inv.id_factura || inv.folio || inv.id));

                    const myPromise = fetchedPromises.find(p => {
                        const pJson = JSON.stringify(p).toLowerCase();
                        // Wisphub often stores the id_factura in 'id_factura' or 'factura'
                        const pFacturaNorm = normalizeId(p.id_factura || p.factura || p.num_factura || '');
                        const pClienteNorm = normalizeId(p.cliente || p.id_cliente || p.servicio || '');

                        return (
                            (pFacturaNorm && myInvoiceIdsNorm.includes(pFacturaNorm)) ||
                            (pClienteNorm && (pClienteNorm === normalizeId(user.id_servicio) || pClienteNorm === normalizeId(user.id_cliente))) ||
                            pJson.includes(String(user.cedula || '').toLowerCase()) ||
                            pJson.includes(String(user.usuario || '').toLowerCase())
                        );
                    });

                    if (myPromise) {
                        activePromiseDate = myPromise.fecha_limite_de_pago || myPromise.fecha_limite || myPromise.fecha;
                    }
                }

                setPromiseDate(activePromiseDate);

                // CHECK FOR NOTIFICATIONS
                const activePromise = !!activePromiseDate;
                notificationService.checkEvents(user, myInvoices, fetchedTickets, activePromiseDate);

            } catch (error) {
                console.error("CRITICAL DASHBOARD ERROR:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.cedula, user?.id_servicio, user?.id_cliente, user?.usuario, user?.nombre]); // Added more dependencies for robustness

    // Safe Helpers
    const safeDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
        } catch { return '-'; }
    };

    // Restoring Missing Helpers
    const calculatedBalance = (recentInvoices || [])
        .filter(inv => {
            const s = String(inv?.estado || '').toLowerCase();
            return s.includes('pendiente') || s.includes('por_pagar') || s.includes('unpaid');
        })
        .reduce((sum, inv) => sum + parseFloat(inv?.total || 0), 0)
        .toFixed(2);

    const getNextPaymentDate = () => {
        const today = new Date();
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        let month = today.getMonth();
        let year = today.getFullYear();
        if (today.getDate() > 25) {
            month++;
            if (month > 11) { month = 0; year++; }
        }
        return `25 ${months[month]}`;
    };

    const normalizedStatus = user?.estado?.toLowerCase()?.trim();
    const isStatusActive = normalizedStatus === 'activo' || normalizedStatus === 'online' || normalizedStatus === 'habilitado';

    const statusColor = isStatusActive ? 'text-green-400' : 'text-red-400';
    const statusBg = isStatusActive ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className="space-y-8 pb-10">
            {/* Headers ... */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <motion.div initial={{ x: -20 }} animate={{ x: 0 }}>
                    <h1 className="text-4xl font-bold text-white font-display tracking-tight neon-text">
                        HOLA, <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-white">{firstName.toUpperCase()}</span>
                    </h1>
                    <p className="text-cyan-200/50 mt-2 text-lg font-mono tracking-widest text-xs uppercase">:: Sistema de Control de Abonado ::</p>
                </motion.div>

                <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={`px-5 py-2 border ${isStatusActive ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'} flex items-center gap-3 backdrop-blur-sm`}
                >
                    <div className="relative">
                        <div className={`w-2 h-2 ${statusBg} animate-pulse`} />
                    </div>
                    <span className={`${statusColor} font-bold tracking-widest text-xs uppercase font-mono`}>{user?.estado || 'Activo'}</span>
                </motion.div>
            </div>

            {/* DEMO MODE WARNING */}
            {(user?.is_offline_mode || user?.id === '99999') && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-center gap-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                >
                    <div className="p-2 bg-amber-500/20 rounded-full">
                        <AlertCircle className="text-amber-500 w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-amber-500 font-bold font-display tracking-wider">MODO DEMO / OFFLINE</h3>
                        <p className="text-amber-200/70 text-sm">
                            {localStorage.getItem('last_api_error') ? `Error: ${localStorage.getItem('last_api_error')}. ` : ''}
                            No se pudo conectar con el servidor de Wisphub. Se están mostrando datos de ejemplo.
                            Por favor verifica el archivo <code>proxy.php</code> o tu conexión a internet.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    label="Saldo Pendiente"
                    value={`$${calculatedBalance}`}
                    icon={CreditCard}
                    colorText={calculatedBalance > 0 ? "text-amber-400" : "text-cyan-400"}
                    colorBg={calculatedBalance > 0 ? "bg-amber-400" : "bg-cyan-400"}
                    subtext="TOTAL"
                    delay={0.1}
                />
                <KpiCard
                    label="Próximo Pago"
                    value={getNextPaymentDate()}
                    icon={Calendar}
                    colorText="text-neon-blue"
                    colorBg="bg-neon-blue"
                    subtext="Vence"
                    delay={0.2}
                />
                <KpiCard
                    label="Tickets Recientes"
                    value={recentTickets?.length || 0}
                    icon={MessageSquare}
                    colorText="text-purple-400"
                    colorBg="bg-purple-400"
                    subtext="ÚLTIMOS 30 DÍAS"
                    delay={0.4}
                />
            </div>

            {/* ACCIONES RÁPIDAS (Quick Actions v1.0) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
                <button
                    onClick={() => navigate('/client/payments')}
                    className="flex flex-col items-center justify-center gap-3 p-4 glass-panel border-cyan-500/20 hover:border-cyan-400/50 bg-cyan-950/20 group transition-all"
                >
                    <CreditCard className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Reportar Pago</span>
                </button>
                <button
                    onClick={() => navigate('/client/request-promise')}
                    className="flex flex-col items-center justify-center gap-3 p-4 glass-panel border-purple-500/20 hover:border-purple-400/50 bg-purple-950/20 group transition-all"
                >
                    <Handshake className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Solicitar Promesa</span>
                </button>
                <button
                    onClick={() => navigate('/client/confirm-payment')}
                    className="flex flex-col items-center justify-center gap-3 p-4 glass-panel border-green-500/20 hover:border-green-400/50 bg-green-950/20 group transition-all col-span-2 md:col-span-1"
                >
                    <CheckSquare className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold text-white tracking-widest uppercase">Reportar Pago Promesa</span>
                </button>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="glass-panel p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display tracking-wide">
                            <FileText className="w-5 h-5 text-cyan-400" />
                            FACTURAS RECIENTES
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-sm">
                            <thead>
                                <tr className="text-cyan-500/70 text-[10px] uppercase tracking-[0.2em] border-b border-cyan-500/10">
                                    <th className="pb-4 pl-4">ID</th>
                                    <th className="pb-4">Fecha</th>
                                    <th className="pb-4">Total</th>
                                    <th className="pb-4">Estado</th>
                                    <th className="pb-4 pr-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-cyan-500/50 animate-pulse">CARGANDO DATOS...</td></tr>
                                ) : !recentInvoices || recentInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-8 text-cyan-500/50">
                                            <div className="flex flex-col items-center gap-2">
                                                <span>NO DATA FOUND</span>
                                                {/* DEBUG BLOCK - v1.9.14 */}
                                                <div className="text-[10px] text-left bg-black/50 p-4 rounded text-slate-400 font-mono w-full max-w-lg mt-4 overflow-auto border border-white/10">
                                                    <p className="text-red-400 font-bold mb-1">🔍 DEBUG INFO (v1.9.14):</p>
                                                    <p>User Svc ID: "{user?.id_servicio}"</p>
                                                    <p>User DNI: "{user?.cedula}"</p>
                                                    <p>User Usu: "{user?.usuario}"</p>
                                                    <p>Total Items: {stats.total}</p>
                                                    <p className="text-red-300">Rejected: {stats.rejected}</p>

                                                    {firstRejected && (
                                                        <div className="mt-2 border-t border-white/10 pt-2 text-[9px]">
                                                            <p className="text-amber-400 font-bold">First Rejected Item (ID: {firstRejected.id_factura || firstRejected.id}):</p>
                                                            <details className="mt-1">
                                                                <summary className="cursor-pointer text-blue-400 underline">VER JSON COMPLETO (ANÁLISIS)</summary>
                                                                <pre className="mt-1 bg-black/40 p-2 rounded whitespace-pre-wrap max-h-40 overflow-auto">
                                                                    {JSON.stringify(firstRejected, null, 2)}
                                                                </pre>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    recentInvoices.map((inv, i) => (
                                        <tr key={inv.id_factura || inv.folio || i} className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors">
                                            <td className="py-3 pl-2 text-cyan-100">#{inv.id_factura || inv.folio || '?'}</td>
                                            <td className="py-3 text-cyan-400/80">{safeDate(inv.fecha_emision)}</td>
                                            <td className="py-3 text-white font-bold">${inv.total || '0.00'}</td>
                                            <td className="py-3 text-right pr-4">
                                                <div className="flex items-center justify-end gap-3">
                                                    <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${inv.estado === 'pagada' ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>
                                                        {inv.estado || 'Desconocido'}
                                                    </span>
                                                    <button
                                                        onClick={() => navigate(`/client/invoices/${inv.id_factura || inv.folio}`)}
                                                        className="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 p-1.5 border border-cyan-500/30 rounded-lg transition-all"
                                                        title="Ver Factura"
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                    {String(inv.estado || '').toLowerCase().includes('pendiente') && (
                                                        <button
                                                            onClick={() => navigate(`/client/payments?invoice=${inv.id_factura || inv.folio}`)}
                                                            className="bg-green-500/20 hover:bg-green-500/40 text-green-400 p-1.5 border border-green-500/30 rounded-lg transition-all"
                                                            title="Reportar Pago"
                                                        >
                                                            <Send size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="glass-panel p-6 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 font-display tracking-wide">
                            <Shield className="w-5 h-5 text-purple-400" />
                            SOPORTE TÉCNICO
                        </h3>
                        <button onClick={() => navigate('/client/support')} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-3 py-1.5 border border-purple-500/30 transition-all font-bold tracking-wider uppercase">+ Nuevo Ticket</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-sm">
                            <thead>
                                <tr className="text-cyan-500/70 text-xs uppercase tracking-wider border-b border-cyan-500/10">
                                    <th className="pb-3 pl-2">Asunto</th>
                                    <th className="pb-3">Fecha</th>
                                    <th className="pb-3 pr-2 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    <tr><td colSpan="3" className="text-center py-8 text-cyan-500/50 animate-pulse">CARGANDO DATOS...</td></tr>
                                ) : !recentTickets || recentTickets.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center py-8 text-cyan-500/50">NO DATA FOUND</td></tr>
                                ) : (
                                    recentTickets.map((ticket, i) => (
                                        <tr key={ticket.id_ticket || i} className="border-b border-cyan-500/5 hover:bg-cyan-500/5 transition-colors">
                                            <td className="py-3 pl-2 text-cyan-100 font-medium">{(ticket.asunto || 'Sin asunto').substring(0, 25)}{(ticket.asunto || '').length > 25 ? '...' : ''}</td>
                                            <td className="py-3 text-cyan-400/80">{safeDate(ticket.fecha_creacion)}</td>
                                            <td className="py-3 pr-2 text-right">
                                                <span className={`px-2 py-0.5 border text-[10px] font-bold uppercase tracking-wider ${ticket.estado === 'Cerrado' || ticket.estado === 'Resuelto' ? 'border-green-500/30 text-green-400' : 'border-purple-500/30 text-purple-400'}`}>
                                                    {ticket.estado || 'Abierto'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ClientDashboard;
