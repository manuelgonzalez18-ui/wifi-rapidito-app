import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, Ban, CalendarDays, CheckCircle2, Clock3, History,
    RefreshCw, Search, ShieldOff, UserRound, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const todayInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    const date = new Date(`${raw}T12:00:00`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(date);
};

const statusMeta = {
    active: { label: 'Bloqueado', tone: 'danger', icon: Ban },
    expired: { label: 'Vencido', tone: 'success', icon: CheckCircle2 },
    revoked: { label: 'Retirado', tone: 'neutral', icon: XCircle },
};

const PromiseRestrictions = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [queryFilter, setQueryFilter] = useState('');
    const [form, setForm] = useState({
        query: '',
        incident_date: todayInput(),
        note: '',
    });

    const load = async () => {
        setLoading(true);
        try {
            const response = await api.get('/promise_restrictions.php', {
                params: { action: 'list' },
                withCredentials: true,
                timeout: 20000,
            });
            setRecords(Array.isArray(response?.data?.restrictions) ? response.data.restrictions : []);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'No pudimos cargar las restricciones de promesas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const needle = queryFilter.trim().toLowerCase();
        if (!needle) return records;
        return records.filter((record) => [
            record.client_name, record.username, record.service_id, record.client_id,
            record.phone, record.cedula, record.email, record.reason, record.note,
        ].filter(Boolean).join(' ').toLowerCase().includes(needle));
    }, [records, queryFilter]);

    const metrics = useMemo(() => ({
        active: records.filter((record) => record.status === 'active').length,
        expired: records.filter((record) => record.status === 'expired').length,
        revoked: records.filter((record) => record.status === 'revoked').length,
        total: records.length,
    }), [records]);

    const createRestriction = async (event) => {
        event.preventDefault();
        if (!form.query.trim()) {
            toast.error('Escribe el usuario, ID de servicio o teléfono del cliente.');
            return;
        }

        setSaving(true);
        try {
            const response = await api.post('/promise_restrictions.php', {
                action: 'create',
                query: form.query.trim(),
                incident_date: form.incident_date,
                note: form.note.trim(),
            }, { withCredentials: true, timeout: 30000 });

            const restriction = response?.data?.restriction;
            toast.success(restriction?.client_name
                ? `Restricción aplicada a ${restriction.client_name} por 3 meses.`
                : 'Restricción aplicada por 3 meses.');
            setForm({ query: '', incident_date: todayInput(), note: '' });
            await load();
        } catch (error) {
            toast.error(error?.response?.data?.error || 'No pudimos registrar la restricción.');
        } finally {
            setSaving(false);
        }
    };

    const revokeRestriction = async (record) => {
        const approved = window.confirm(`¿Retirar anticipadamente la restricción de ${record.client_name || record.username || 'este cliente'}?`);
        if (!approved) return;
        try {
            await api.post('/promise_restrictions.php', { action: 'revoke', id: record.id }, {
                withCredentials: true,
                timeout: 15000,
            });
            toast.success('Restricción retirada. El cliente podrá volver a solicitar promesas si cumple las demás reglas.');
            await load();
        } catch (error) {
            toast.error(error?.response?.data?.error || 'No pudimos retirar la restricción.');
        }
    };

    return (
        <div className="space-y-6 pb-6">
            <PageHeading
                eyebrow="Política de crédito · Promesas"
                title="Restricciones de promesas de pago"
                description="Bloquea durante 3 meses el beneficio de una nueva promesa cuando un cliente incumple. La restricción vence automáticamente y se aplica en el portal y en el asistente de WhatsApp."
                action={<button type="button" onClick={load} className="secondary-action" disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar</button>}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ['Bloqueados ahora', metrics.active, ShieldOff, 'bg-red-400/10 text-red-300'],
                    ['Vencidos', metrics.expired, Clock3, 'bg-emerald-400/10 text-emerald-300'],
                    ['Retirados manualmente', metrics.revoked, XCircle, 'bg-slate-400/10 text-slate-300'],
                    ['Histórico total', metrics.total, History, 'bg-cyan-400/10 text-cyan-300'],
                ].map(([label, value, Icon, tone]) => (
                    <Surface key={label} className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div>
                            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span>
                        </div>
                    </Surface>
                ))}
            </div>

            <Surface className="p-5 sm:p-6">
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">Registra el cliente exacto de la notificación de WispHub</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">Puedes pegar su usuario (por ejemplo, el que termina en @wifi-rapidito), ID de servicio o teléfono. El servidor lo valida contra el directorio de clientes de WispHub antes de aplicar el bloqueo.</p>
                    </div>
                </div>

                <form onSubmit={createRestriction} className="grid gap-4 lg:grid-cols-[1.25fr_.65fr_1fr_auto] lg:items-end">
                    <div>
                        <label htmlFor="restriction-query" className="mb-2 block text-sm font-semibold text-slate-300">Cliente en WispHub</label>
                        <div className="relative"><UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input id="restriction-query" value={form.query} onChange={(event) => setForm({ ...form, query: event.target.value })} placeholder="usuario@wifi-rapidito, servicio o teléfono" className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm" /></div>
                    </div>
                    <div>
                        <label htmlFor="restriction-date" className="mb-2 block text-sm font-semibold text-slate-300">Fecha de incumplimiento</label>
                        <div className="relative"><CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input id="restriction-date" type="date" value={form.incident_date} onChange={(event) => setForm({ ...form, incident_date: event.target.value })} className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm" /></div>
                    </div>
                    <div>
                        <label htmlFor="restriction-note" className="mb-2 block text-sm font-semibold text-slate-300">Nota opcional</label>
                        <input id="restriction-note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Ej. notificación Corte Automático" className="glass-input w-full rounded-xl px-4 py-3 text-sm" maxLength={500} />
                    </div>
                    <button type="submit" className="primary-action min-h-12 whitespace-nowrap" disabled={saving}>{saving ? <RefreshCw size={16} className="animate-spin" /> : <Ban size={16} />} Bloquear 3 meses</button>
                </form>
            </Surface>

            <Surface className="overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-white/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div><h2 className="font-semibold text-white">Historial de restricciones</h2><p className="mt-1 text-xs text-slate-500">Las vencidas se conservan como historial, pero ya no bloquean al cliente.</p></div>
                    <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={queryFilter} onChange={(event) => setQueryFilter(event.target.value)} placeholder="Buscar cliente, usuario o servicio…" className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm" /></div>
                </div>

                {loading ? <div className="p-5"><LoadingBlock label="Cargando restricciones…" /></div> : null}
                {!loading && filtered.length === 0 ? <div className="p-5"><EmptyState icon={CheckCircle2} title="Sin restricciones registradas" description="Cuando recibas una notificación de incumplimiento de WispHub, registra al cliente desde el formulario superior." /></div> : null}

                {!loading && filtered.length > 0 ? <div className="divide-y divide-white/6">{filtered.map((record) => {
                    const meta = statusMeta[record.status] || statusMeta.expired;
                    const Icon = meta.icon;
                    return <div key={record.id} className="p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-white">{record.client_name || 'Cliente WispHub'}</h3><StatusPill tone={meta.tone}><Icon size={12} /> {meta.label}</StatusPill></div>
                                <p className="mt-1 text-sm text-slate-400">{record.username || 'Sin usuario'} {record.service_id ? `· Servicio #${record.service_id}` : ''}</p>
                                <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2 xl:grid-cols-4">
                                    <span><strong className="text-slate-300">Incumplimiento:</strong> {formatDate(record.incident_date)}</span>
                                    <span><strong className="text-slate-300">Bloqueado hasta:</strong> {formatDate(record.ends_at)}</span>
                                    <span><strong className="text-slate-300">Teléfono:</strong> {record.phone || '—'}</span>
                                    <span><strong className="text-slate-300">Registrado por:</strong> {record.created_by || 'admin'}</span>
                                </div>
                                {record.note ? <p className="mt-3 rounded-lg border border-white/6 bg-black/10 px-3 py-2 text-xs leading-5 text-slate-400">{record.note}</p> : null}
                                {record.revoked_at ? <p className="mt-2 text-xs text-slate-600">Retirada el {formatDate(record.revoked_at)} por {record.revoked_by || 'administración'}.</p> : null}
                            </div>
                            {record.status === 'active' ? <button type="button" onClick={() => revokeRestriction(record)} className="secondary-action whitespace-nowrap"><XCircle size={16} /> Retirar bloqueo</button> : null}
                        </div>
                    </div>;
                })}</div> : null}
            </Surface>
        </div>
    );
};

export default PromiseRestrictions;
