import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, CalendarDays, CheckCircle2, Download, FileText, Filter,
    HardHat, MapPinned, MessageSquare, Phone, RefreshCw, Search,
    ShieldCheck, TicketCheck, UserRound, Wifi, Wrench,
} from 'lucide-react';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const stripHtml = (value = '') => String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalize = (value) => String(value || '').trim().toLowerCase();

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const statusTone = (status) => {
    const value = normalize(status);
    if (value.includes('cerr') || value.includes('resuel') || value.includes('final')) return 'success';
    if (value.includes('proceso') || value.includes('asign') || value.includes('visita')) return 'warning';
    if (value.includes('cancel')) return 'danger';
    return 'info';
};

const priorityTone = (priority) => {
    const value = normalize(priority);
    if (value.includes('urg') || value.includes('alta')) return 'danger';
    if (value.includes('media')) return 'warning';
    if (value.includes('baja')) return 'success';
    return 'neutral';
};

const isOpenTicket = (ticket) => {
    const value = normalize(ticket?.status);
    return !(value.includes('cerr') || value.includes('resuel') || value.includes('final') || value.includes('cancel'));
};

const ticketSearchText = (ticket) => [
    ticket?.id, ticket?.subject, ticket?.status, ticket?.priority, ticket?.department,
    ticket?.technician, ticket?.description, ticket?.service_id, ticket?.client_id,
    ticket?.client?.name, ticket?.client?.cedula, ticket?.client?.phone, ticket?.client?.email,
    ticket?.client?.address, ticket?.client?.user, ticket?.client?.plan, ticket?.client?.node,
].filter(Boolean).join(' ').toLowerCase();

const printableStyles = `
@page { margin: 15mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
h1,h2,p { margin: 0; }
.header { padding-bottom: 16px; border-bottom: 2px solid #0891b2; margin-bottom: 18px; }
.brand { color: #0891b2; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; }
h1 { margin-top: 5px; font-size: 23px; }
.muted { color: #64748b; }
.meta { display: flex; gap: 18px; margin-top: 8px; color: #475569; flex-wrap: wrap; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px; }
.summary > div { border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; }
.summary strong { display: block; font-size: 19px; margin-top: 4px; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th,td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; text-align: left; }
th { font-size: 9px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
.ticket { page-break-inside: avoid; margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 9px; overflow: hidden; }
.ticket-head { padding: 11px 12px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; }
.ticket-head h2 { font-size: 15px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); }
.field { padding: 9px 11px; border-bottom: 1px solid #e2e8f0; }
.field:nth-child(odd) { border-right: 1px solid #e2e8f0; }
.label { display: block; color: #64748b; text-transform: uppercase; font-size: 8px; font-weight: bold; letter-spacing: .5px; margin-bottom: 3px; }
.description { padding: 11px; white-space: pre-wrap; line-height: 1.5; }
.extra { padding: 11px; border-top: 1px solid #e2e8f0; }
.extra-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px 14px; margin-top: 7px; }
.extra-row { overflow-wrap: anywhere; }
.footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 9px; }
`;

const printReport = (tickets, title) => {
    if (!tickets.length) return;
    const popup = window.open('', '_blank');
    if (!popup) return;
    popup.opener = null;

    const openCount = tickets.filter(isOpenTicket).length;
    const highCount = tickets.filter((ticket) => ['alta', 'urgente'].some((p) => normalize(ticket.priority).includes(p))).length;
    const installationCount = tickets.filter((ticket) => normalize(ticket.subject) === 'instalacion').length;

    const rows = tickets.map((ticket) => `
        <tr>
            <td>#${escapeHtml(ticket.id || '—')}</td><td>${escapeHtml(ticket.subject || 'Sin asunto')}</td>
            <td>${escapeHtml(ticket.client?.name || '—')}</td><td>${escapeHtml(ticket.service_id || '—')}</td>
            <td>${escapeHtml(ticket.status || '—')}</td><td>${escapeHtml(ticket.priority || '—')}</td>
            <td>${escapeHtml(ticket.technician || '—')}</td><td>${escapeHtml(formatDateTime(ticket.created_at))}</td>
        </tr>`).join('');

    const details = tickets.map((ticket) => {
        const extras = Object.entries(ticket.wisphub_fields || {}).slice(0, 80)
            .map(([key, value]) => `<div class="extra-row"><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</div>`).join('');
        return `
        <section class="ticket">
            <div class="ticket-head"><h2>Ticket #${escapeHtml(ticket.id || '—')} · ${escapeHtml(ticket.subject || 'Sin asunto')}</h2>
                <div class="meta"><span>Estado: <strong>${escapeHtml(ticket.status || '—')}</strong></span><span>Prioridad: <strong>${escapeHtml(ticket.priority || '—')}</strong></span><span>Técnico: <strong>${escapeHtml(ticket.technician || 'Sin asignar')}</strong></span></div>
            </div>
            <div class="grid">
                <div class="field"><span class="label">Cliente</span>${escapeHtml(ticket.client?.name || '—')}</div>
                <div class="field"><span class="label">Servicio</span>${escapeHtml(ticket.service_id || '—')}</div>
                <div class="field"><span class="label">Cédula / RIF</span>${escapeHtml(ticket.client?.cedula || '—')}</div>
                <div class="field"><span class="label">Teléfono</span>${escapeHtml(ticket.client?.phone || '—')}</div>
                <div class="field"><span class="label">Dirección</span>${escapeHtml(ticket.client?.address || '—')}</div>
                <div class="field"><span class="label">Plan</span>${escapeHtml(ticket.client?.plan || '—')}</div>
                <div class="field"><span class="label">Creado</span>${escapeHtml(formatDateTime(ticket.created_at))}</div>
                <div class="field"><span class="label">Actualizado / cierre</span>${escapeHtml(formatDateTime(ticket.updated_at))}</div>
            </div>
            <div class="description"><span class="label">Descripción</span>${escapeHtml(stripHtml(ticket.description) || 'Sin descripción disponible.')}</div>
            ${extras ? `<div class="extra"><span class="label">Campos adicionales recibidos de WispHub</span><div class="extra-grid">${extras}</div></div>` : ''}
        </section>`;
    }).join('');

    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${printableStyles}</style></head><body>
        <header class="header"><div class="brand">Wifi Rapidito · Soporte Técnico</div><h1>${escapeHtml(title)}</h1>
        <div class="meta"><span>Generado: ${escapeHtml(formatDateTime(new Date().toISOString()))}</span><span>Tickets incluidos: ${tickets.length}</span></div></header>
        <section class="summary"><div><span class="muted">Tickets</span><strong>${tickets.length}</strong></div><div><span class="muted">Abiertos</span><strong>${openCount}</strong></div><div><span class="muted">Alta / urgente</span><strong>${highCount}</strong></div><div><span class="muted">Instalaciones</span><strong>${installationCount}</strong></div></section>
        <table><thead><tr><th>Ticket</th><th>Asunto</th><th>Cliente</th><th>Servicio</th><th>Estado</th><th>Prioridad</th><th>Técnico</th><th>Fecha</th></tr></thead><tbody>${rows}</tbody></table>
        ${details}<footer class="footer">Reporte operativo generado desde Wifi Rapidito con información disponible en WispHub. En el diálogo de impresión selecciona “Guardar como PDF”.</footer>
    </body></html>`);
    popup.document.close();
    window.setTimeout(() => {
        popup.focus();
        popup.print();
    }, 350);
};

const Field = ({ label, value, icon: Icon }) => (
    <div className="rounded-xl border border-white/8 bg-black/10 p-3.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{Icon ? <Icon size={13} /> : null} {label}</div>
        <p className="mt-1.5 break-words text-sm font-medium text-slate-200">{value || '—'}</p>
    </div>
);

const StaffSupportDashboard = () => {
    const [tickets, setTickets] = useState([]);
    const [meta, setMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [subject, setSubject] = useState('all');
    const [priority, setPriority] = useState('all');
    const [technician, setTechnician] = useState('all');
    const [selectedId, setSelectedId] = useState('');

    const loadTickets = useCallback(async (force = false) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/support_dashboard.php${force ? '?refresh=1' : ''}`, {
                withCredentials: true,
                timeout: 30000,
                headers: { 'Cache-Control': 'no-cache' },
            });
            const list = Array.isArray(response?.data?.tickets) ? response.data.tickets : [];
            setTickets(list);
            setMeta(response?.data?.meta || {});
            setSelectedId((current) => current || list[0]?.id || '');
        } catch (requestError) {
            console.error('Support dashboard load error:', requestError);
            setError(requestError?.response?.status === 401
                ? 'La sesión de personal venció. Cierra sesión e ingresa nuevamente.'
                : requestError?.response?.data?.error || 'No pudimos cargar la información de soporte desde WispHub.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTickets(false); }, [loadTickets]);

    const options = useMemo(() => ({
        subjects: [...new Set(tickets.map((ticket) => ticket.subject).filter(Boolean))].sort(),
        statuses: [...new Set(tickets.map((ticket) => ticket.status).filter(Boolean))].sort(),
        priorities: [...new Set(tickets.map((ticket) => ticket.priority).filter(Boolean))].sort(),
        technicians: [...new Set(tickets.map((ticket) => ticket.technician).filter(Boolean))].sort(),
    }), [tickets]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return tickets.filter((ticket) => {
            if (needle && !ticketSearchText(ticket).includes(needle)) return false;
            if (status !== 'all' && ticket.status !== status) return false;
            if (subject !== 'all' && ticket.subject !== subject) return false;
            if (priority !== 'all' && ticket.priority !== priority) return false;
            if (technician !== 'all' && ticket.technician !== technician) return false;
            return true;
        });
    }, [tickets, query, status, subject, priority, technician]);

    const selected = filtered.find((ticket) => String(ticket.id) === String(selectedId)) || filtered[0] || null;
    const metrics = useMemo(() => ({
        total: tickets.length,
        open: tickets.filter(isOpenTicket).length,
        priority: tickets.filter((ticket) => ['alta', 'urgente'].some((p) => normalize(ticket.priority).includes(p))).length,
        installations: tickets.filter((ticket) => normalize(ticket.subject) === 'instalacion').length,
        routeChanges: tickets.filter((ticket) => normalize(ticket.subject) === 'cambio de ruta').length,
    }), [tickets]);

    const clearFilters = () => {
        setQuery(''); setStatus('all'); setSubject('all'); setPriority('all'); setTechnician('all');
    };

    return (
        <div className="space-y-6 pb-6">
            <PageHeading eyebrow="Operaciones · WispHub" title="Dashboard de soporte técnico"
                description="Tickets, clientes, servicios, prioridades, técnicos y datos operativos disponibles en WispHub, en una sola vista."
                action={<div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => loadTickets(true)} className="secondary-action" disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar</button>
                    <button type="button" onClick={() => printReport(filtered, 'Reporte de soporte técnico')} className="primary-action" disabled={!filtered.length}><Download size={16} /> Generar PDF</button>
                </div>} />

            {meta?.warning || meta?.clients_warning ? <Surface className="flex items-start gap-3 border-amber-400/20 bg-amber-400/[0.05] p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><p className="font-semibold text-amber-100">Datos parciales o en caché</p><p className="mt-1 text-sm text-amber-100/70">{meta.warning || meta.clients_warning}</p></div>
            </Surface> : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                    ['Tickets WispHub', metrics.total, MessageSquare, 'bg-cyan-400/10 text-cyan-300'],
                    ['Requieren atención', metrics.open, Wrench, 'bg-amber-400/10 text-amber-300'],
                    ['Alta / urgente', metrics.priority, AlertTriangle, 'bg-red-400/10 text-red-300'],
                    ['Instalaciones', metrics.installations, HardHat, 'bg-violet-400/10 text-violet-300'],
                    ['Cambios de ruta', metrics.routeChanges, MapPinned, 'bg-emerald-400/10 text-emerald-300'],
                ].map(([label, value, Icon, tone]) => <Surface key={label} className="p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}><Icon size={18} /></span></div></Surface>)}
            </div>

            <Surface className="p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white"><Filter size={16} className="text-cyan-300" /> Filtros operativos</div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
                    <div className="relative"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, ticket, servicio, teléfono, dirección…" className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm" /></div>
                    <select value={status} onChange={(event) => setStatus(event.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm"><option value="all">Todos los estados</option>{options.statuses.map((value) => <option key={value} value={value} className="bg-slate-900">{value}</option>)}</select>
                    <select value={subject} onChange={(event) => setSubject(event.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm"><option value="all">Todos los asuntos</option>{options.subjects.map((value) => <option key={value} value={value} className="bg-slate-900">{value}</option>)}</select>
                    <select value={priority} onChange={(event) => setPriority(event.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm"><option value="all">Toda prioridad</option>{options.priorities.map((value) => <option key={value} value={value} className="bg-slate-900">{value}</option>)}</select>
                    <select value={technician} onChange={(event) => setTechnician(event.target.value)} className="glass-input rounded-xl px-3 py-2.5 text-sm"><option value="all">Todos los técnicos</option>{options.technicians.map((value) => <option key={value} value={value} className="bg-slate-900">{value}</option>)}</select>
                    <button type="button" onClick={clearFilters} className="secondary-action whitespace-nowrap">Limpiar</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>{filtered.length} de {tickets.length} tickets</span>{meta?.loaded_at ? <span>Actualizado: {formatDateTime(meta.loaded_at)}</span> : null}{meta?.cached ? <span className="text-cyan-300">Respuesta en caché</span> : null}</div>
            </Surface>

            {loading ? <LoadingBlock label="Consultando soporte y clientes en WispHub…" /> : null}
            {!loading && error ? <EmptyState icon={AlertTriangle} title="No pudimos cargar soporte" description={error} action={<button type="button" onClick={() => loadTickets(true)} className="secondary-action"><RefreshCw size={16} /> Reintentar</button>} /> : null}
            {!loading && !error && filtered.length === 0 ? <EmptyState icon={CheckCircle2} title="No hay tickets con esos filtros" description="Limpia los filtros o actualiza la información desde WispHub." action={<button type="button" onClick={clearFilters} className="secondary-action">Limpiar filtros</button>} /> : null}

            {!loading && !error && filtered.length > 0 ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(380px,.95fr)]">
                <Surface className="overflow-hidden">
                    <div className="border-b border-white/8 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">Cola de soporte</h2><p className="mt-1 text-xs text-slate-500">Selecciona un ticket para ver su ficha completa.</p></div><TicketCheck size={19} className="text-cyan-300" /></div></div>
                    <div className="max-h-[72vh] divide-y divide-white/6 overflow-y-auto">{filtered.map((ticket) => {
                        const active = String(selected?.id) === String(ticket.id);
                        return <button type="button" key={ticket.id || `${ticket.subject}-${ticket.created_at}`} onClick={() => setSelectedId(String(ticket.id))} className={`w-full p-4 text-left transition sm:p-5 ${active ? 'bg-cyan-400/[0.06]' : 'hover:bg-white/[0.025]'}`}>
                            <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{ticket.subject || 'Sin asunto'}</p><StatusPill tone={priorityTone(ticket.priority)}>{ticket.priority}</StatusPill></div><p className="mt-1 text-xs text-slate-500">Ticket #{ticket.id || '—'} · Servicio #{ticket.service_id || '—'}</p><p className="mt-2 truncate text-sm font-medium text-slate-300">{ticket.client?.name || 'Cliente no identificado'}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{stripHtml(ticket.description) || 'Sin descripción.'}</p></div><StatusPill tone={statusTone(ticket.status)}>{ticket.status || 'Sin estado'}</StatusPill></div>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600"><span>{formatDateTime(ticket.created_at)}</span><span>Técnico: {ticket.technician || 'Sin asignar'}</span></div>
                        </button>;
                    })}</div>
                </Surface>

                {selected ? <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                    <Surface className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="app-eyebrow">Ticket #{selected.id || '—'}</p><h2 className="text-xl font-bold text-white">{selected.subject || 'Reporte de soporte'}</h2><div className="mt-3 flex flex-wrap gap-2"><StatusPill tone={statusTone(selected.status)}>{selected.status || 'Sin estado'}</StatusPill><StatusPill tone={priorityTone(selected.priority)}>{selected.priority}</StatusPill></div></div><button type="button" onClick={() => printReport([selected], `Orden de soporte · Ticket #${selected.id || ''}`)} className="secondary-action"><FileText size={16} /> PDF del ticket</button></div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Cliente" value={selected.client?.name} icon={UserRound} /><Field label="Servicio" value={selected.service_id ? `#${selected.service_id}` : '—'} icon={Wifi} /><Field label="Teléfono" value={selected.client?.phone} icon={Phone} /><Field label="Cédula / RIF" value={selected.client?.cedula} icon={ShieldCheck} /><Field label="Dirección" value={selected.client?.address} icon={MapPinned} /><Field label="Plan" value={selected.client?.plan} icon={Wifi} /><Field label="Técnico" value={selected.technician || 'Sin asignar'} icon={Wrench} /><Field label="Departamento" value={selected.department || '—'} icon={HardHat} /><Field label="Creado" value={formatDateTime(selected.created_at)} icon={CalendarDays} /><Field label="Actualizado / cierre" value={formatDateTime(selected.updated_at)} icon={CalendarDays} /></div>
                        <div className="mt-4 rounded-xl border border-white/8 bg-black/10 p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">Descripción del reporte</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{stripHtml(selected.description) || 'Sin descripción disponible.'}</p></div>
                    </Surface>
                    <Surface className="p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-white">Datos adicionales de WispHub</h3><p className="mt-1 text-xs text-slate-500">Campos adicionales disponibles para diagnóstico y entrega al técnico.</p></div><FileText size={18} className="text-slate-500" /></div><div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">{Object.entries(selected.wisphub_fields || {}).length ? Object.entries(selected.wisphub_fields || {}).map(([key, value]) => <div key={key} className="grid gap-1 rounded-lg border border-white/6 bg-black/10 p-3 sm:grid-cols-[150px_1fr]"><span className="break-words text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-600">{key}</span><span className="break-words text-xs text-slate-300">{String(value)}</span></div>) : <p className="text-sm text-slate-500">WispHub no entregó campos adicionales para este ticket.</p>}</div></Surface>
                </div> : null}
            </div> : null}
        </div>
    );
};

export default StaffSupportDashboard;
