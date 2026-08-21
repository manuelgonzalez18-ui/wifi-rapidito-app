import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Wifi, CreditCard, FileText, LifeBuoy, Handshake,
    CheckCircle2, AlertTriangle, Clock3, ArrowRight, Receipt,
    MapPin, Router, CalendarDays, Bell
} from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import api from '../../api/client';
import notificationService from '../../services/notificationService';
import {
    EmptyState,
    LoadingBlock,
    PageHeading,
    QuickAction,
    StatusPill,
    Surface,
    formatDate,
    formatMoney,
    invoiceStatusMeta,
    normalizeInvoiceStatus,
} from '../../components/ui/ClientUi';

const extractItems = (response) => {
    const data = response?.data;
    if (Array.isArray(data?.results)) return data.results;
    return Array.isArray(data) ? data : [];
};

const invoiceId = (invoice) => invoice?.id_factura || invoice?.folio || invoice?.id;

const belongsToUser = (item, user) => {
    const userCandidates = [
        user?.id_servicio,
        user?.id_cliente,
        user?.cedula,
        user?.usuario,
        user?.usuario_portal,
    ].filter(Boolean).map(String);

    const objectId = (value) => value && typeof value === 'object'
        ? value.id || value.id_servicio || value.id_cliente || ''
        : value || '';

    const itemCandidates = [
        item?.id_servicio,
        item?.id_cliente,
        item?.cliente_id,
        item?.servicio_id,
        item?.cedula,
        objectId(item?.cliente),
        objectId(item?.servicio),
        item?.cliente?.cedula,
        item?.cliente?.id_cliente,
        item?.cliente?.usuario,
        item?.servicio?.id_servicio,
        ...(item?.articulos || []).map((article) => article?.servicio?.id_servicio),
    ].filter(Boolean).map(String);

    return userCandidates.some((candidate) => itemCandidates.includes(candidate));
};

const ClientDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [promiseDate, setPromiseDate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const fetchData = async () => {
            if (!user?.cedula && !user?.id_cliente && !user?.id_servicio && !user?.usuario) {
                if (active) {
                    setError('No encontramos la información necesaria para cargar tu cuenta.');
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            setError('');

            try {
                const invoiceQueries = [
                    user?.usuario ? api.get(`/facturas/?cliente=${encodeURIComponent(user.usuario)}&limit=50`) : null,
                    user?.cedula ? api.get(`/facturas/?search=${encodeURIComponent(user.cedula)}&limit=50`) : null,
                    user?.id_servicio ? api.get(`/facturas/?id_servicio=${encodeURIComponent(user.id_servicio)}&limit=50`) : null,
                    user?.id_cliente ? api.get(`/facturas/?id_cliente=${encodeURIComponent(user.id_cliente)}&limit=50`) : null,
                    user?.id_servicio ? api.get(`/facturas/?servicio=${encodeURIComponent(user.id_servicio)}&limit=50`) : null,
                ].filter(Boolean);

                const [invoiceResponses, ticketResponse, promiseResponse] = await Promise.all([
                    Promise.allSettled(invoiceQueries),
                    user?.id_servicio
                        ? api.get(`/tickets/?servicio=${encodeURIComponent(user.id_servicio)}`).catch(() => ({ data: { results: [] } }))
                        : Promise.resolve({ data: { results: [] } }),
                    user?.id_servicio
                        ? api.get(`/promesas-de-pago/?cliente=${encodeURIComponent(user.id_servicio)}`).catch(() => ({ data: { results: [] } }))
                        : Promise.resolve({ data: { results: [] } }),
                ]);

                const deduped = new Map();
                invoiceResponses.forEach((result) => {
                    if (result.status !== 'fulfilled') return;
                    extractItems(result.value).forEach((invoice) => {
                        const id = invoiceId(invoice);
                        if (id && belongsToUser(invoice, user)) deduped.set(String(id), invoice);
                    });
                });

                const myInvoices = Array.from(deduped.values())
                    .sort((a, b) => Number(invoiceId(b) || 0) - Number(invoiceId(a) || 0));

                const myTickets = extractItems(ticketResponse).filter((ticket) => {
                    if (!user?.id_servicio) return false;
                    const ticketService = ticket?.id_servicio || ticket?.servicio?.id_servicio || ticket?.servicio;
                    return String(ticketService || '') === String(user.id_servicio);
                });

                let nextPromise = user?.promesa_pago?.fecha_limite_de_pago
                    || user?.promesa_pago?.fecha_limite
                    || null;

                if (!nextPromise) {
                    const promises = extractItems(promiseResponse);
                    const match = promises.find((promise) => {
                        const linked = promise?.cliente || promise?.id_cliente || promise?.servicio;
                        return String(linked || '') === String(user?.id_servicio || '')
                            || String(linked || '') === String(user?.id_cliente || '');
                    });
                    nextPromise = match?.fecha_limite_de_pago || match?.fecha_limite || match?.fecha || null;
                }

                if (!active) return;
                setInvoices(myInvoices);
                setTickets(myTickets);
                setPromiseDate(nextPromise);

                try {
                    notificationService.checkEvents(user, myInvoices, myTickets, nextPromise);
                } catch {
                    // Notifications are optional and must not block the dashboard.
                }
            } catch (requestError) {
                console.error('Dashboard load error:', requestError);
                if (active) setError('No pudimos actualizar tu información. Intenta nuevamente en unos momentos.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();
        return () => { active = false; };
    }, [user?.cedula, user?.id_cliente, user?.id_servicio, user?.usuario]);

    const pendingInvoices = useMemo(
        () => invoices.filter((invoice) => ['pending', 'overdue'].includes(normalizeInvoiceStatus(invoice?.estado))),
        [invoices]
    );

    const balance = useMemo(
        () => pendingInvoices.reduce((sum, invoice) => sum + Number.parseFloat(invoice?.total || 0), 0),
        [pendingInvoices]
    );

    const currentInvoice = pendingInvoices[0] || null;
    const recentInvoice = invoices[0] || null;
    const recentTicket = tickets[0] || null;
    const firstName = String(user?.nombre || user?.name || 'Cliente').trim().split(/\s+/)[0];
    const normalizedStatus = String(user?.estado || '').toLowerCase().trim();
    const serviceActive = ['activo', 'online', 'habilitado'].includes(normalizedStatus) || !normalizedStatus;
    const planName = user?.plan_internet || user?.plan || user?.servicio?.plan || user?.nombre_plan || 'Tu plan de internet';
    const address = user?.direccion || user?.servicio?.direccion || '';

    if (loading) {
        return (
            <div className="space-y-5">
                <PageHeading eyebrow="Autogestión" title={`Hola, ${firstName}`} description="Estamos actualizando el estado de tu cuenta." />
                <LoadingBlock label="Consultando servicio, facturas y soporte…" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Autogestión"
                title={`Hola, ${firstName}`}
                description="Consulta tu servicio, facturas, pagos y soporte desde un solo lugar."
                action={(
                    <button
                        type="button"
                        onClick={() => navigate('/client/settings')}
                        className="secondary-action"
                        aria-label="Ver configuración"
                    >
                        <Bell size={17} /> Preferencias
                    </button>
                )}
            />

            {error ? (
                <Surface className="flex items-start gap-3 border-amber-400/20 bg-amber-400/[0.06] p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">No pudimos actualizar todo</p>
                        <p className="mt-1 text-sm leading-5 text-amber-100/65">{error}</p>
                    </div>
                </Surface>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
                <Surface className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Estado del servicio</p>
                            <div className="mt-3 flex items-center gap-3">
                                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${serviceActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-red-400/10 text-red-300'}`}>
                                    <Wifi className="h-5 w-5" />
                                </span>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{serviceActive ? 'Servicio activo' : 'Servicio con restricción'}</h2>
                                    <p className="mt-0.5 text-sm text-slate-400">{planName}</p>
                                </div>
                            </div>
                        </div>
                        <StatusPill tone={serviceActive ? 'success' : 'danger'}>
                            <span className={`h-1.5 w-1.5 rounded-full ${serviceActive ? 'bg-emerald-300' : 'bg-red-300'}`} />
                            {user?.estado || (serviceActive ? 'Activo' : 'Revisar')}
                        </StatusPill>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        {user?.id_servicio ? (
                            <div className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                                <div className="flex items-center gap-2 text-xs text-slate-500"><Router size={14} /> Servicio</div>
                                <p className="mt-1.5 truncate text-sm font-semibold text-slate-200">#{user.id_servicio}</p>
                            </div>
                        ) : null}
                        {address ? (
                            <div className="rounded-xl border border-white/8 bg-black/10 p-3.5">
                                <div className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={14} /> Dirección</div>
                                <p className="mt-1.5 line-clamp-1 text-sm font-semibold text-slate-200">{address}</p>
                            </div>
                        ) : null}
                    </div>
                </Surface>

                <Surface className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Saldo pendiente</p>
                            <p className="mt-2 text-4xl font-bold tracking-tight text-white">{formatMoney(balance)}</p>
                            <p className="mt-2 text-sm text-slate-400">
                                {currentInvoice
                                    ? `Factura #${invoiceId(currentInvoice)}${currentInvoice?.fecha_vencimiento ? ` · vence ${formatDate(currentInvoice.fecha_vencimiento)}` : ''}`
                                    : 'No tienes facturas pendientes.'}
                            </p>
                        </div>
                        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${balance > 0 ? 'bg-amber-400/10 text-amber-300' : 'bg-emerald-400/10 text-emerald-300'}`}>
                            {balance > 0 ? <Receipt className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                        </span>
                    </div>

                    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                        {currentInvoice ? (
                            <button
                                type="button"
                                onClick={() => navigate(`/client/payments?invoice=${invoiceId(currentInvoice)}`)}
                                className="primary-action flex-1"
                            >
                                <CreditCard size={17} /> Reportar pago
                            </button>
                        ) : null}
                        <button type="button" onClick={() => navigate('/client/invoices')} className="secondary-action flex-1">
                            <FileText size={17} /> Ver facturas
                        </button>
                    </div>
                </Surface>
            </div>

            {promiseDate ? (
                <Surface className="flex flex-col gap-4 border-violet-400/15 bg-violet-400/[0.05] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                            <Handshake size={19} />
                        </span>
                        <div>
                            <p className="font-semibold text-white">Promesa de pago activa</p>
                            <p className="mt-1 text-sm text-slate-400">Fecha límite: {formatDate(promiseDate)}</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => navigate('/client/request-promise')} className="secondary-action">Ver detalle</button>
                </Surface>
            ) : null}

            <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-semibold text-white">Acciones rápidas</p>
                        <p className="mt-0.5 text-xs text-slate-500">Lo que más necesitas, sin buscar entre menús.</p>
                    </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <QuickAction icon={CreditCard} label="Reportar pago" description="Usa el formulario requerido para validación Banesco." onClick={() => navigate(currentInvoice ? `/client/payments?invoice=${invoiceId(currentInvoice)}` : '/client/payments')} tone="emerald" />
                    <QuickAction icon={FileText} label="Mis facturas" description="Consulta pendientes, pagadas y el detalle de cada factura." onClick={() => navigate('/client/invoices')} />
                    <QuickAction icon={LifeBuoy} label="Soporte técnico" description="Revisa tus tickets o crea un nuevo reporte." onClick={() => navigate('/client/support')} tone="amber" />
                    <QuickAction icon={Handshake} label="Promesa de pago" description="Gestiona tu solicitud de promesa cuando la necesites." onClick={() => navigate('/client/request-promise')} tone="violet" />
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <Surface className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white">Última factura</p>
                            <p className="mt-1 text-xs text-slate-500">Tu movimiento de facturación más reciente.</p>
                        </div>
                        <button type="button" onClick={() => navigate('/client/invoices')} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                            Ver todas
                        </button>
                    </div>

                    {recentInvoice ? (
                        <button
                            type="button"
                            onClick={() => navigate(`/client/invoices/${invoiceId(recentInvoice)}`)}
                            className="mt-5 flex w-full items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/10 p-4 text-left transition hover:border-cyan-400/20 hover:bg-white/[0.03]"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold text-white">Factura #{invoiceId(recentInvoice)}</p>
                                    {(() => { const meta = invoiceStatusMeta(recentInvoice?.estado); return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>; })()}
                                </div>
                                <p className="mt-2 text-sm text-slate-400">{formatDate(recentInvoice?.fecha_emision)} · {formatMoney(recentInvoice?.total)}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 text-slate-500" />
                        </button>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No hay facturas para mostrar.</div>
                    )}
                </Surface>

                <Surface className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white">Soporte</p>
                            <p className="mt-1 text-xs text-slate-500">Estado de tu reporte más reciente.</p>
                        </div>
                        <button type="button" onClick={() => navigate('/client/support')} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                            Abrir soporte
                        </button>
                    </div>

                    {recentTicket ? (
                        <div className="mt-5 rounded-xl border border-white/8 bg-black/10 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-white">{recentTicket?.asunto || 'Ticket de soporte'}</p>
                                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-400">{String(recentTicket?.descripcion || '').replace(/<[^>]*>/g, '') || 'Sin descripción disponible.'}</p>
                                </div>
                                <StatusPill tone={String(recentTicket?.estado || '').toLowerCase().includes('cerr') ? 'neutral' : 'info'}>
                                    {recentTicket?.estado || 'Abierto'}
                                </StatusPill>
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                                <Clock3 size={13} /> {formatDate(recentTicket?.fecha_creacion)}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">No tienes tickets recientes.</div>
                    )}
                </Surface>
            </div>

            {!invoices.length && !tickets.length && !error ? (
                <EmptyState
                    icon={CalendarDays}
                    title="Tu cuenta está lista"
                    description="No encontramos movimientos recientes que necesiten tu atención."
                />
            ) : null}
        </div>
    );
};

export default ClientDashboard;
