import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, CreditCard, Receipt, ArrowRight, RefreshCw } from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../auth/authStore';
import {
    EmptyState,
    LoadingBlock,
    PageHeading,
    StatusPill,
    Surface,
    formatDate,
    formatMoney,
    invoiceStatusMeta,
    normalizeInvoiceStatus,
} from '../../components/ui/ClientUi';

const getInvoiceId = (invoice) => invoice?.id_factura || invoice?.folio || invoice?.id;

const getItems = (response) => {
    const data = response?.data;
    if (Array.isArray(data?.results)) return data.results;
    return Array.isArray(data) ? data : [];
};

const belongsToUser = (invoice, user) => {
    const userIds = [user?.id_servicio, user?.id_cliente, user?.cedula, user?.usuario, user?.usuario_portal]
        .filter(Boolean)
        .map(String);

    const itemIds = [
        invoice?.id_servicio,
        invoice?.id_cliente,
        invoice?.cliente_id,
        invoice?.servicio_id,
        invoice?.cedula,
        invoice?.cliente?.id_cliente,
        invoice?.cliente?.cedula,
        invoice?.cliente?.usuario,
        invoice?.servicio?.id_servicio,
        ...(invoice?.articulos || []).map((article) => article?.servicio?.id_servicio),
    ].filter(Boolean).map(String);

    return userIds.some((id) => itemIds.includes(id));
};

const FILTERS = [
    { id: 'all', label: 'Todas' },
    { id: 'pending', label: 'Pendientes' },
    { id: 'paid', label: 'Pagadas' },
];

const Invoices = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;

        const fetchInvoices = async () => {
            if (!user?.cedula && !user?.id_servicio && !user?.id_cliente && !user?.usuario) {
                if (active) {
                    setError('No encontramos los datos necesarios para consultar tus facturas.');
                    setLoading(false);
                }
                return;
            }

            setLoading(true);
            setError('');

            try {
                const queries = [
                    user?.usuario ? api.get(`/facturas/?cliente=${encodeURIComponent(user.usuario)}&limit=50`) : null,
                    user?.cedula ? api.get(`/facturas/?search=${encodeURIComponent(user.cedula)}&limit=50`) : null,
                    user?.id_servicio ? api.get(`/facturas/?id_servicio=${encodeURIComponent(user.id_servicio)}&limit=50`) : null,
                    user?.id_cliente ? api.get(`/facturas/?id_cliente=${encodeURIComponent(user.id_cliente)}&limit=50`) : null,
                    user?.id_servicio ? api.get(`/facturas/?servicio=${encodeURIComponent(user.id_servicio)}&limit=50`) : null,
                ].filter(Boolean);

                const responses = await Promise.allSettled(queries);
                const unique = new Map();

                responses.forEach((result) => {
                    if (result.status !== 'fulfilled') return;
                    getItems(result.value).forEach((invoice) => {
                        const id = getInvoiceId(invoice);
                        if (id && belongsToUser(invoice, user)) unique.set(String(id), invoice);
                    });
                });

                const result = Array.from(unique.values())
                    .sort((a, b) => Number(getInvoiceId(b) || 0) - Number(getInvoiceId(a) || 0));

                if (active) setInvoices(result);
            } catch (requestError) {
                console.error('Invoice load error:', requestError);
                if (active) setError('No pudimos actualizar tus facturas. Puedes intentarlo nuevamente.');
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchInvoices();
        return () => { active = false; };
    }, [user?.cedula, user?.id_servicio, user?.id_cliente, user?.usuario, reloadKey]);

    const summary = useMemo(() => {
        const pending = invoices.filter((invoice) => ['pending', 'overdue'].includes(normalizeInvoiceStatus(invoice?.estado)));
        const paid = invoices.filter((invoice) => normalizeInvoiceStatus(invoice?.estado) === 'paid');
        return {
            pendingCount: pending.length,
            paidCount: paid.length,
            pendingTotal: pending.reduce((sum, invoice) => sum + Number.parseFloat(invoice?.total || 0), 0),
        };
    }, [invoices]);

    const filteredInvoices = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return invoices.filter((invoice) => {
            const status = normalizeInvoiceStatus(invoice?.estado);
            const matchesFilter = filterStatus === 'all'
                || (filterStatus === 'pending' && ['pending', 'overdue'].includes(status))
                || status === filterStatus;

            if (!matchesFilter) return false;
            if (!query) return true;

            return [getInvoiceId(invoice), invoice?.total, invoice?.fecha_emision, invoice?.estado]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));
        });
    }, [invoices, filterStatus, searchTerm]);

    const openInvoice = (invoice) => navigate(`/client/invoices/${getInvoiceId(invoice)}`);

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Facturación"
                title="Mis facturas"
                description="Consulta tu historial, identifica pendientes y abre el detalle de cada factura."
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Saldo pendiente</p>
                    <p className="mt-2 text-2xl font-bold text-white">{formatMoney(summary.pendingTotal)}</p>
                    <p className="mt-1 text-xs text-slate-500">{summary.pendingCount} factura{summary.pendingCount === 1 ? '' : 's'} por atender</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pagadas</p>
                    <p className="mt-2 text-2xl font-bold text-white">{summary.paidCount}</p>
                    <p className="mt-1 text-xs text-slate-500">En el historial disponible</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total visibles</p>
                    <p className="mt-2 text-2xl font-bold text-white">{invoices.length}</p>
                    <p className="mt-1 text-xs text-slate-500">Facturas asociadas a tu cuenta</p>
                </Surface>
            </div>

            <Surface className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            inputMode="search"
                            placeholder="Buscar por factura, monto o fecha"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                type="button"
                                onClick={() => setFilterStatus(filter.id)}
                                className={`min-h-10 shrink-0 rounded-xl px-4 text-sm font-semibold transition ${
                                    filterStatus === filter.id
                                        ? 'border border-cyan-400/20 bg-cyan-400/10 text-cyan-200'
                                        : 'border border-white/8 bg-white/[0.035] text-slate-400 hover:text-white'
                                }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>
            </Surface>

            {loading ? <LoadingBlock label="Consultando tus facturas…" /> : null}

            {!loading && error ? (
                <EmptyState
                    icon={RefreshCw}
                    title="No pudimos cargar las facturas"
                    description={error}
                    action={(
                        <button type="button" className="secondary-action" onClick={() => setReloadKey((value) => value + 1)}>
                            <RefreshCw size={16} /> Reintentar
                        </button>
                    )}
                />
            ) : null}

            {!loading && !error && filteredInvoices.length === 0 ? (
                <EmptyState
                    icon={Receipt}
                    title={invoices.length ? 'No encontramos coincidencias' : 'No tienes facturas para mostrar'}
                    description={invoices.length
                        ? 'Prueba con otro término o cambia el filtro seleccionado.'
                        : 'Cuando exista una factura asociada a tu servicio aparecerá aquí.'}
                />
            ) : null}

            {!loading && !error && filteredInvoices.length > 0 ? (
                <div className="grid gap-3">
                    {filteredInvoices.map((invoice) => {
                        const id = getInvoiceId(invoice);
                        const status = normalizeInvoiceStatus(invoice?.estado);
                        const meta = invoiceStatusMeta(invoice?.estado);
                        const canReport = ['pending', 'overdue'].includes(status);

                        return (
                            <Surface key={id} className="p-4 sm:p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={() => openInvoice(invoice)}
                                        className="min-w-0 flex-1 text-left"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/[0.08] text-cyan-300">
                                                <FileText size={17} />
                                            </span>
                                            <p className="font-semibold text-white">Factura #{id}</p>
                                            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Monto</p>
                                                <p className="mt-1 text-lg font-bold text-white">{formatMoney(invoice?.total)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Emitida</p>
                                                <p className="mt-1 text-sm font-semibold text-slate-300">{formatDate(invoice?.fecha_emision)}</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-[11px] uppercase tracking-[0.1em] text-slate-600">Pago</p>
                                                <p className="mt-1 text-sm font-semibold text-slate-300">{formatDate(invoice?.fecha_pago, 'Sin pago registrado')}</p>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex gap-2 sm:flex-col sm:items-stretch">
                                        <button type="button" onClick={() => openInvoice(invoice)} className="secondary-action flex-1 sm:flex-none">
                                            Ver detalle <ArrowRight size={16} />
                                        </button>
                                        {canReport ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/client/payments?invoice=${id}`)}
                                                className="primary-action flex-1 sm:flex-none"
                                            >
                                                <CreditCard size={16} /> Reportar pago
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </Surface>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
};

export default Invoices;
