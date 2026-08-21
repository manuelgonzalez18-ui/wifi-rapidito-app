import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    MessageSquare, Plus, Paperclip, X, Send,
    Clock3, Stethoscope, ChevronRight, AlertTriangle, CheckCircle2
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../auth/authStore';
import { toast } from 'react-hot-toast';
import {
    EmptyState,
    LoadingBlock,
    PageHeading,
    StatusPill,
    Surface,
    formatDate,
} from '../../components/ui/ClientUi';

const SUBJECTS = [
    'Internet Lento',
    'No Tiene Internet',
    'Internet Intermitente',
    'Cable Fibra Dañado',
    'Router En Rojo',
    'Reubicacion Del Router',
    'Cambio De Contraseña En Router Wifi',
    'Falla Masiva En Mi Comunidad',
    'Otro Asunto'
];

const DEPARTMENTS = ['Soporte Técnico', 'Finanzas', 'Otro'];
const stripHtml = (value = '') => String(value).replace(/<[^>]*>/g, '').trim();

const ticketTone = (status) => {
    const value = String(status || '').toLowerCase();
    if (value.includes('cerr')) return 'neutral';
    if (value.includes('proceso') || value.includes('asign')) return 'warning';
    if (value.includes('abierto')) return 'info';
    return 'info';
};

const Support = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showNewTicket, setShowNewTicket] = useState(false);
    const [newItem, setNewItem] = useState({
        asunto: '',
        departamento: 'Soporte Técnico',
        descripcion: '',
        prioridad: 'media'
    });
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchTickets = async () => {
        if (!user?.id_servicio) {
            setLoading(false);
            setError('No encontramos el identificador de tu servicio para consultar los tickets.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/tickets/?servicio=${encodeURIComponent(user.id_servicio)}`);
            const items = Array.isArray(response?.data?.results)
                ? response.data.results
                : (Array.isArray(response?.data) ? response.data : []);

            const mine = items.filter((ticket) => {
                const service = ticket?.id_servicio || ticket?.servicio?.id_servicio || ticket?.servicio;
                return String(service || '') === String(user.id_servicio);
            });

            setTickets(mine.sort((a, b) => Number(b?.id_ticket || 0) - Number(a?.id_ticket || 0)));
        } catch (requestError) {
            console.error('Ticket load error:', requestError);
            setError('No pudimos actualizar tus tickets en este momento.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [user?.id_servicio]);

    useEffect(() => {
        if (!location.state?.openTicket) return;

        const subject = SUBJECTS.includes(location.state.subject)
            ? location.state.subject
            : 'Otro Asunto';

        setNewItem((current) => ({
            ...current,
            asunto: subject,
            descripcion: location.state.description || current.descripcion,
        }));
        setShowNewTicket(true);
    }, [location.key, location.state]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!newItem.asunto || !newItem.descripcion.trim()) {
            toast.error('Completa el asunto y la descripción.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('servicio', user.id_servicio || user.id_cliente);
            formData.append('asunto', newItem.asunto);
            formData.append('departamento', newItem.departamento);
            formData.append('descripcion', `<p>${newItem.descripcion}</p>`);
            formData.append('prioridad', newItem.prioridad);
            if (file) formData.append('archivo', file);

            await api.post('/tickets/', formData);
            toast.success('Ticket creado correctamente');
            setShowNewTicket(false);
            setNewItem({ asunto: '', departamento: 'Soporte Técnico', descripcion: '', prioridad: 'media' });
            setFile(null);
            await fetchTickets();
        } catch (requestError) {
            console.error('Ticket creation error:', requestError);
            const apiError = requestError?.response?.data;
            const message = typeof apiError === 'string'
                ? apiError
                : apiError && typeof apiError === 'object'
                    ? Object.entries(apiError).map(([key, value]) => `${key}: ${value}`).join(' · ')
                    : 'No pudimos crear el ticket. Intenta nuevamente.';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const activeTickets = tickets.filter((ticket) => !String(ticket?.estado || '').toLowerCase().includes('cerr'));

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Ayuda"
                title="Soporte técnico"
                description="Diagnostica problemas comunes, crea un reporte y consulta el estado de tus tickets."
                action={(
                    <button type="button" onClick={() => setShowNewTicket(true)} className="primary-action">
                        <Plus size={17} /> Crear ticket
                    </button>
                )}
            />

            <Surface className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                            <Stethoscope size={22} />
                        </span>
                        <div>
                            <p className="font-semibold text-white">¿Problemas con tu conexión?</p>
                            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
                                El diagnóstico guiado te ayuda a revisar las causas más comunes antes de abrir un ticket.
                            </p>
                        </div>
                    </div>
                    <button type="button" onClick={() => navigate('/client/doctor')} className="secondary-action shrink-0">
                        Iniciar diagnóstico <ChevronRight size={16} />
                    </button>
                </div>
            </Surface>

            <div className="grid gap-3 sm:grid-cols-3">
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Abiertos</p>
                    <p className="mt-2 text-2xl font-bold text-white">{activeTickets.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Requieren seguimiento</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Historial</p>
                    <p className="mt-2 text-2xl font-bold text-white">{tickets.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Tickets disponibles</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Servicio</p>
                    <p className="mt-2 truncate text-lg font-bold text-white">#{user?.id_servicio || '—'}</p>
                    <p className="mt-1 text-xs text-slate-500">Identificador asociado</p>
                </Surface>
            </div>

            {loading ? <LoadingBlock label="Consultando tus tickets…" /> : null}

            {!loading && error ? (
                <Surface className="flex items-start gap-3 border-amber-400/20 bg-amber-400/[0.05] p-5">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">No pudimos actualizar soporte</p>
                        <p className="mt-1 text-sm text-amber-100/65">{error}</p>
                        <button type="button" onClick={fetchTickets} className="mt-3 text-sm font-semibold text-amber-200 hover:text-white">Reintentar</button>
                    </div>
                </Surface>
            ) : null}

            {!loading && !error && tickets.length === 0 ? (
                <EmptyState
                    icon={CheckCircle2}
                    title="No tienes tickets recientes"
                    description="Si tu conexión presenta una falla puedes iniciar el diagnóstico o crear un nuevo reporte."
                    action={(
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button type="button" onClick={() => navigate('/client/doctor')} className="secondary-action">Diagnosticar conexión</button>
                            <button type="button" onClick={() => setShowNewTicket(true)} className="primary-action">Crear ticket</button>
                        </div>
                    )}
                />
            ) : null}

            {!loading && !error && tickets.length > 0 ? (
                <section className="space-y-3">
                    <div>
                        <h2 className="text-sm font-semibold text-white">Tus reportes</h2>
                        <p className="mt-1 text-xs text-slate-500">Los más recientes aparecen primero.</p>
                    </div>
                    {tickets.map((ticket, index) => (
                        <motion.div
                            key={ticket?.id_ticket || `${ticket?.asunto}-${index}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.2) }}
                        >
                            <Surface className="p-4 sm:p-5">
                                <div className="flex items-start gap-4">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-slate-300">
                                        <MessageSquare size={18} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-white">{ticket?.asunto || 'Reporte de soporte'}</p>
                                                <p className="mt-1 text-xs text-slate-500">Ticket #{ticket?.id_ticket || '—'}</p>
                                            </div>
                                            <StatusPill tone={ticketTone(ticket?.estado)}>{ticket?.estado || 'Abierto'}</StatusPill>
                                        </div>
                                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                                            {stripHtml(ticket?.descripcion) || 'Sin descripción disponible.'}
                                        </p>
                                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                            <Clock3 size={13} /> {formatDate(ticket?.fecha_creacion)}
                                        </div>
                                    </div>
                                </div>
                            </Surface>
                        </motion.div>
                    ))}
                </section>
            ) : null}

            <AnimatePresence>
                {showNewTicket ? (
                    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
                        <motion.button
                            type="button"
                            aria-label="Cerrar formulario"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowNewTicket(false)}
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b1422] shadow-2xl sm:rounded-3xl"
                        >
                            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#0b1422]/95 p-5 backdrop-blur-xl">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-400">Nuevo reporte</p>
                                    <h2 className="mt-1 text-xl font-bold text-white">Cuéntanos qué sucede</h2>
                                </div>
                                <button type="button" onClick={() => setShowNewTicket(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-slate-400 hover:text-white" aria-label="Cerrar">
                                    <X size={19} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-300">Asunto</label>
                                    <select
                                        value={newItem.asunto}
                                        onChange={(event) => setNewItem({ ...newItem, asunto: event.target.value })}
                                        className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                                        required
                                    >
                                        <option value="" disabled>Selecciona el problema</option>
                                        {SUBJECTS.map((subject) => <option key={subject} value={subject} className="bg-slate-900">{subject}</option>)}
                                    </select>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-300">Departamento</label>
                                        <select
                                            value={newItem.departamento}
                                            onChange={(event) => setNewItem({ ...newItem, departamento: event.target.value })}
                                            className="glass-input w-full rounded-xl px-4 py-3 text-sm"
                                        >
                                            {DEPARTMENTS.map((department) => <option key={department} value={department} className="bg-slate-900">{department}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-slate-300">Prioridad</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['baja', 'media', 'alta'].map((priority) => (
                                                <button
                                                    key={priority}
                                                    type="button"
                                                    onClick={() => setNewItem({ ...newItem, prioridad: priority })}
                                                    className={`min-h-11 rounded-xl border text-xs font-bold capitalize transition ${newItem.prioridad === priority
                                                        ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                                                        : 'border-white/8 bg-white/[0.035] text-slate-500 hover:text-white'}`}
                                                >
                                                    {priority}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-300">Descripción</label>
                                    <textarea
                                        value={newItem.descripcion}
                                        onChange={(event) => setNewItem({ ...newItem, descripcion: event.target.value })}
                                        placeholder="Describe lo que está ocurriendo y desde cuándo."
                                        rows={5}
                                        className="glass-input w-full resize-none rounded-xl px-4 py-3 text-sm leading-6"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-slate-300">Adjunto opcional</label>
                                    <input id="ticket-file" type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                                    <label htmlFor="ticket-file" className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-cyan-400/20 hover:text-slate-200">
                                        <Paperclip size={18} />
                                        <span className="min-w-0 truncate">{file?.name || 'Seleccionar archivo'}</span>
                                    </label>
                                </div>

                                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                                    <button type="button" onClick={() => setShowNewTicket(false)} className="secondary-action">Cancelar</button>
                                    <button type="submit" disabled={submitting} className="primary-action disabled:cursor-not-allowed disabled:opacity-50">
                                        {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={17} />}
                                        {submitting ? 'Enviando…' : 'Crear ticket'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                ) : null}
            </AnimatePresence>
        </div>
    );
};

export default Support;
