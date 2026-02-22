// Support.jsx - v1.12.2 - Logic confirmed for FormData and file upload
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Search, Filter, Paperclip, X, Send, LifeBuoy, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../auth/authStore';
import { toast } from 'react-hot-toast';

const Support = () => {
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewTicket, setShowNewTicket] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        asunto: '',
        departamento: 'Soporte Técnico',
        descripcion: '',
        prioridad: 'media'
    });
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Options derived from screenshots
    const subjects = [
        "Internet Lento",
        "No Tiene Internet",
        "Internet Intermitente",
        "Cable Fibra Dañado",
        "Router En Rojo",
        "Reubicacion Del Router",
        "Cambio De Contraseña En Router Wifi",
        "Falla Masiva En Mi Comunidad",
        "Otro Asunto"
    ];

    const departments = ["Soporte Técnico", "Finanzas", "Otro"];

    useEffect(() => {
        fetchTickets();
    }, [user?.id_servicio]);

    const fetchTickets = async () => {
        if (!user?.id_servicio) return;
        try {
            // Mandatory filter in query string
            const res = await api.get(`/tickets/?servicio=${user.id_servicio}`);
            if (res.data && Array.isArray(res.data.results)) {
                // Double check locally for extra security
                const myTickets = res.data.results.filter(t => {
                    const getVal = (v) => (v && typeof v === 'object') ? (v.id || v.id_servicio) : v;
                    const tServiceId = String(getVal(t.id_servicio) || getVal(t.servicio?.id_servicio) || getVal(t.servicio) || '');
                    return tServiceId === String(user.id_servicio) ||
                        JSON.stringify(t).toLowerCase().includes(String(user.cedula || '').toLowerCase());
                });
                setTickets(myTickets);
            }
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newItem.asunto || !newItem.descripcion) {
            toast.error("Por favor completa el asunto y la descripción.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('servicio', user.id_servicio || user.id_cliente);
            formData.append('asunto', newItem.asunto);
            formData.append('departamento', newItem.departamento);
            formData.append('descripcion', `<p>${newItem.descripcion}</p>`);
            formData.append('prioridad', newItem.prioridad); // Proxy handles string-to-number

            if (file) {
                formData.append('archivo', file);
            }

            // POST as FormData
            await api.post('/tickets/', formData);

            toast.success("Ticket creado exitosamente");
            setShowNewTicket(false);
            setNewItem({ asunto: '', departamento: 'Soporte Técnico', descripcion: '', prioridad: 'media' });
            setFile(null);

            // Reload list
            setTimeout(fetchTickets, 1000);

        } catch (error) {
            console.error("Error al crear ticket:", error.response?.data || error.message);
            const apiError = error.response?.data;
            let msg = "Error al crear el ticket";

            if (apiError && typeof apiError === 'object') {
                msg = Object.entries(apiError).map(([k, v]) => `${k}: ${v}`).join(' | ');
            } else if (typeof apiError === 'string') {
                msg = apiError;
            }

            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'abierto': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'cerrado': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
            case 'en proceso': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
            default: return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
        }
    };

    return (
        <div className="space-y-6 pb-10 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                    <h1 className="text-3xl font-bold text-white font-display">Soporte Técnico</h1>
                    <p className="text-slate-400">Gestiona tus reportes y solicita ayuda.</p>
                </motion.div>
                <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewTicket(true)}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 flex items-center gap-2 transition-all"
                >
                    <Plus size={20} />
                    Crear Ticket
                </motion.button>
            </div>

            {/* Tickets List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Cargando tickets...</div>
                ) : tickets.length === 0 ? (
                    <div className="glass-panel p-12 rounded-2xl text-center">
                        <LifeBuoy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Sin Tickets Recientes</h3>
                        <p className="text-slate-400 mb-6">No tienes reportes activos. ¡Todo funciona bien!</p>
                        <button
                            onClick={() => setShowNewTicket(true)}
                            className="text-primary-400 font-bold hover:text-primary-300 transition-colors"
                        >
                            + Crear primer reporte
                        </button>
                    </div>
                ) : (
                    tickets.map((ticket, i) => (
                        <motion.div
                            key={ticket.id_ticket || i}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className="glass-panel p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-full bg-white/5 text-slate-400`}>
                                    <MessageSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">{ticket.asunto || 'Sin Asunto'}</h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 md:line-clamp-1 max-w-xl">
                                        {ticket.descripcion?.replace(/<[^>]*>?/gm, '') || 'Sin descripción'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} /> {new Date(ticket.fecha_creacion || Date.now()).toLocaleDateString()}
                                        </span>
                                        <span>•</span>
                                        <span>#{ticket.id_ticket}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(ticket.estado)}`}>
                                {ticket.estado || 'Abierto'}
                            </span>
                        </motion.div>
                    ))
                )}
            </div>

            {/* New Ticket Modal */}
            <AnimatePresence>
                {showNewTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewTicket(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg glass-panel bg-[#1a1f2e] border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-white/5 bg-primary-600/10 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <LifeBuoy className="text-primary-400" />
                                    Nuevo Reporte
                                </h2>
                                <button
                                    onClick={() => setShowNewTicket(false)}
                                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Asunto</label>
                                    <div className="relative">
                                        <select
                                            value={newItem.asunto}
                                            onChange={(e) => {
                                                setNewItem({ ...newItem, asunto: e.target.value });
                                            }}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:border-primary-500/50 transition-colors"
                                            required
                                        >
                                            <option value="" disabled>Seleccionar asunto...</option>
                                            {subjects.map(s => (
                                                <option key={s} value={s} className="bg-slate-800 text-white">{s}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1" /></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Departamento</label>
                                    <div className="relative">
                                        <select
                                            value={newItem.departamento}
                                            onChange={(e) => setNewItem({ ...newItem, departamento: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white appearance-none focus:outline-none focus:border-primary-500/50 transition-colors text-sm"
                                        >
                                            {departments.map(d => (
                                                <option key={d} value={d} className="bg-slate-800 text-white">{d}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Prioridad</label>
                                    <div className="flex gap-2">
                                        {['baja', 'media', 'alta'].map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setNewItem({ ...newItem, prioridad: p })}
                                                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-all ${newItem.prioridad === p
                                                    ? 'bg-primary-600/20 border-primary-500 text-primary-400'
                                                    : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Descripción</label>
                                    <textarea
                                        value={newItem.descripcion}
                                        onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
                                        placeholder="Detalla tu problema aquí..."
                                        rows="4"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary-500/50 transition-colors resize-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Adjuntar Archivo (Opcional)</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={(e) => setFile(e.target.files[0])}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="flex items-center gap-3 w-full bg-black/20 border border-white/10 border-dashed rounded-xl px-4 py-3 text-slate-400 cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                            <Paperclip size={18} />
                                            <span className="text-sm truncate">
                                                {file ? file.name : "Seleccionar imagen, PDF, Word..."}
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewTicket(false)}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        {submitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span>Crear Ticket</span>
                                                <Send size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Support;
