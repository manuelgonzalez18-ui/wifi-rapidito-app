import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Download, Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../auth/authStore';

const Invoices = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!user?.cedula) return;
            try {
                // Targeted search
                const invoiceQueries = [
                    api.get(`/facturas/?cliente=${user.usuario}&limit=50`),
                    api.get(`/facturas/?search=${user.cedula}&limit=50`),
                    api.get(`/facturas/?id_servicio=${user.id_servicio}&limit=50`),
                    api.get(`/facturas/?id_cliente=${user.id_cliente}&limit=50`),
                    api.get(`/facturas/?servicio=${user.id_servicio}&limit=50`) // NEW v1.9.14
                ];
                const userStripped = String(user.usuario || '').replace('@wifi-rapidito', '').toLowerCase();

                // Fetch extra queries
                const responses = await Promise.allSettled(invoiceQueries);

                let allResults = [];
                responses.forEach(res => {
                    if (res.status === 'fulfilled') {
                        const data = res.value.data;
                        const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
                        allResults.push(...items);
                    }
                });

                // Deduplicate by Invoice ID or Folio
                const uniqueMap = new Map();
                allResults.forEach(item => {
                    const id = item.id_factura || item.id || item.folio;
                    if (id) {
                        const itemCedula = String(item.cedula || item.cliente?.cedula || item.cedula_cliente || '').toLowerCase().replace(/[^0-9]/g, '');
                        const userCedulaClean = String(user.cedula || '').toLowerCase().replace(/[^0-9]/g, '');
                        const itemNombre = String(item.nombre || item.cliente?.nombre || item.nombre_cliente || '').toLowerCase();
                        // UNIVERSAL ID MATCHER (v1.9.14)
                        const userCandidates = [
                            user.id_servicio,
                            user.id_cliente,
                            user.cedula,
                            user.usuario,
                            user.usuario_portal
                        ].filter(x => x).map(String);

                        const getVal = (v) => (v && typeof v === 'object') ? (v.id || v.id_servicio || v.id_cliente) : v;
                        const itemCandidates = [
                            String(item.id_servicio || ''),
                            String(item.id_cliente || ''),
                            String(item.cliente_id || ''),
                            String(item.servicio_id || ''),
                            String(item.cliente?.id_cliente || ''),
                            String(item.cliente?.usuario || ''),
                            String(item.servicio?.id_servicio || ''),
                            // NEW: Extract from articulos
                            ...(item.articulos || []).map(art => String(art.servicio?.id_servicio || ''))
                        ].filter(x => x && x !== 'undefined' && x !== 'null');

                        let isMine = userCandidates.some(uId => itemCandidates.includes(uId));

                        // Name Fallback - DISABLED v1.9.10
                        /*
                        if (!isMine) {
                            const userStripped = String(user.nombre || '').toLowerCase().replace(/[^a-z]/g, '');
                            const itemUser = String(item.usuario || item.cliente?.usuario || '').toLowerCase().replace(/[^a-z]/g, '');
                            if (userStripped.length > 3 && itemUser.includes(userStripped)) isMine = true;
                        }
                        */
                        // 5. Emergency Fallback: REMOVED
                        // else { isMine = true; }

                        if (isMine) {
                            uniqueMap.set(id, item);
                        }
                    }
                });
                let uniqueInvoices = Array.from(uniqueMap.values());

                // SAFETY NET REMOVED (v1.9.9-SECURE)

                if (uniqueInvoices.length > 0) {
                    // Sort newest first
                    uniqueInvoices.sort((a, b) => (b.id_factura || b.id || 0) - (a.id_factura || a.id || 0));
                    setInvoices(uniqueInvoices);
                } else {
                    setInvoices([]);
                }
            } catch (error) {
                console.error("Error fetching invoices:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [user?.cedula, user?.id_servicio, user?.id_cliente, user?.nombre, user?.usuario]);

    // UI Filtering Logic
    const filteredInvoices = invoices.filter(inv => {
        const id = (inv.id_factura || inv.id || '').toString();
        const total = (inv.total || '').toString();
        const matchesSearch = id.includes(searchTerm) || total.includes(searchTerm);

        const matchesStatus =
            filterStatus === 'all' ? true :
                filterStatus === 'pending' ? (inv.estado === 'pendiente' || inv.estado === 'por_pagar') :
                    inv.estado === filterStatus;

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        const styles = {
            pagada: 'bg-green-500/20 text-green-400 border-green-500/30',
            pendiente: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            por_pagar: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            vencida: 'bg-red-500/20 text-red-400 border-red-500/30',
            cancelada: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
        const icons = {
            pagada: CheckCircle,
            pendiente: Clock,
            por_pagar: Clock,
            vencida: AlertCircle,
        };

        const Icon = icons[status] || AlertCircle;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border flex items-center gap-1 w-fit ${styles[status] || styles.cancelada}`}>
                <Icon size={12} />
                {status}
            </span>
        );
    };

    const handleViewPdf = (invoice) => {
        const identifier = invoice.folio || invoice.id_factura || invoice.id;
        navigate(`/client/invoices/${identifier}`);
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <h1 className="text-3xl font-bold text-white font-display">Mis Facturas</h1>
                    <p className="text-slate-400">Historial completo de pagos y facturación.</p>
                </motion.div>
            </div>

            {/* Controls */}
            <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por ID o Monto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary-500/50 transition-colors"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilterStatus('pagada')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterStatus === 'pagada' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        Pagadas
                    </button>
                </div>
            </div>

            {/* Table */}
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-panel rounded-2xl overflow-hidden border border-white/5"
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 pl-6"># Factura</th>
                                <th className="p-4">Fecha Emisión</th>
                                <th className="p-4">Fecha Pago</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4 pr-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-500">Cargando historial...</td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-12 text-slate-500">No se encontraron facturas.</td></tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <tr key={inv.id_factura || inv.id || Math.random()} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 pl-6 font-mono text-slate-300">#{inv.id_factura || inv.folio}</td>
                                        <td className="p-4 text-slate-400">{inv.fecha_emision ? new Date(inv.fecha_emision).toLocaleDateString() : '-'}</td>
                                        <td className="p-4 text-slate-400">
                                            {inv.fecha_pago ? new Date(inv.fecha_pago).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 font-bold text-white text-lg">${parseFloat(inv.total || 0).toFixed(2)}</td>
                                        <td className="p-4">
                                            {getStatusBadge(inv.estado)}
                                        </td>
                                        <td className="p-4 pr-6 flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewPdf(inv)}
                                                className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors group/btn relative"
                                                title="Ver Factura PDF"
                                            >
                                                <FileText size={18} />
                                            </button>

                                            {(inv.estado === 'pendiente' || inv.estado === 'por_pagar') && (
                                                <button
                                                    onClick={() => navigate(`/client/payments?invoice=${inv.id_factura || inv.id}`)}
                                                    className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-white text-xs font-bold rounded-lg shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                                                >
                                                    <Download size={14} />
                                                    Reportar
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default Invoices;
