import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Globe2, RefreshCw, Search, Smartphone } from 'lucide-react';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const VALIDATED_SOURCES = new Set(['portal', 'whatsapp_bot']);

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const textKey = (value) => String(value ?? '').trim().toLowerCase();
const dateKey = (value) => String(value ?? '').trim().slice(0, 10);
const amountKey = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : '';
};

const formatAmount = (value, currency = 'VES') => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '—';
    const formatted = amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return currency === 'VES' ? `Bs. ${formatted}` : `${formatted} ${currency || ''}`.trim();
};

const formatDateTime = (value) => {
    if (!hasValue(value)) return '—';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const humanStatus = (value, fallback = '—') => {
    if (!hasValue(value)) return fallback;
    const normalized = textKey(value);
    if (['validated', 'ok', 'success', '200'].includes(normalized)) return 'Validado';
    if (['registered', 'paid', 'pagado', 'pagada'].includes(normalized)) return 'Registrado';
    if (normalized === 'unknown') return 'Sin confirmar';
    return String(value);
};

const pickHistoryMatch = (payment, historyRows) => {
    const paymentId = textKey(payment.payment_id);
    if (paymentId) {
        const match = historyRows.find((row) => textKey(row.payment_id) === paymentId);
        if (match) return match;
    }

    const invoiceId = textKey(payment.invoice_id);
    if (invoiceId) {
        const invoiceMatches = historyRows.filter((row) => textKey(row.invoice_id) === invoiceId);
        if (invoiceMatches.length === 1) return invoiceMatches[0];
        if (invoiceMatches.length > 1) {
            const reference = textKey(payment.reference);
            const exact = invoiceMatches.find((row) => reference && textKey(row.reference) === reference);
            if (exact) return exact;
            const day = dateKey(payment.payment_date || payment.created_at);
            const amount = amountKey(payment.amount);
            const narrowed = invoiceMatches.filter((row) => (
                (!day || dateKey(row.payment_date || row.created_at) === day)
                && (!amount || amountKey(row.amount) === amount)
            ));
            if (narrowed.length === 1) return narrowed[0];
        }
    }

    const reference = textKey(payment.reference);
    if (reference) {
        const referenceMatches = historyRows.filter((row) => textKey(row.reference) === reference);
        if (referenceMatches.length === 1) return referenceMatches[0];
        if (referenceMatches.length > 1) {
            const day = dateKey(payment.payment_date || payment.created_at);
            const amount = amountKey(payment.amount);
            const narrowed = referenceMatches.filter((row) => (
                (!day || dateKey(row.payment_date || row.created_at) === day)
                && (!amount || amountKey(row.amount) === amount)
            ));
            if (narrowed.length === 1) return narrowed[0];
        }
    }

    const day = dateKey(payment.payment_date || payment.created_at);
    const amount = amountKey(payment.amount);
    if (day && amount) {
        const amountDateMatches = historyRows.filter((row) => (
            dateKey(row.payment_date || row.created_at) === day
            && amountKey(row.amount) === amount
        ));
        if (amountDateMatches.length === 1) return amountDateMatches[0];

        const serviceId = textKey(payment.service_id);
        if (serviceId) {
            const byService = amountDateMatches.filter((row) => textKey(row.service_id) === serviceId);
            if (byService.length === 1) return byService[0];
        }
    }

    return null;
};

const enrichValidatedRows = (rows) => {
    const historyRows = rows.filter((row) => row?.source === 'wisphub_history');
    return rows
        .filter((row) => VALIDATED_SOURCES.has(row?.source))
        .map((payment) => {
            const history = pickHistoryMatch(payment, historyRows);
            if (!history) return payment;

            const historicalMethod = textKey(payment.method).includes('histórico');
            return {
                ...payment,
                client_name: history.client_name || payment.client_name,
                username: history.username || payment.username,
                service_id: payment.service_id || history.service_id,
                invoice_id: payment.invoice_id || history.invoice_id,
                payment_id: payment.payment_id || history.payment_id,
                reference: payment.reference || history.reference,
                amount: payment.amount ?? history.amount,
                currency: payment.currency || history.currency || 'VES',
                payment_date: payment.payment_date || history.payment_date,
                method: payment.payment_type_label || (!historicalMethod && payment.method ? payment.method : (history.method || payment.method)),
                history_enriched: true,
            };
        });
};

const DetailCell = ({ label, value, mono = false }) => {
    if (!hasValue(value)) return null;
    return (
        <div className="min-w-0 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</p>
            <p className={`mt-1 break-words text-sm text-slate-200 ${mono ? 'font-mono' : ''}`}>{value}</p>
        </div>
    );
};

const ValidatedPayments = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let active = true;
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await api.get('/payment_audit.php?limit=2000', {
                    withCredentials: true,
                    timeout: 30000,
                    headers: { 'Cache-Control': 'no-cache' },
                });
                const rows = Array.isArray(response?.data?.payments) ? response.data.payments : [];
                if (active) setPayments(enrichValidatedRows(rows));
            } catch (requestError) {
                if (active) {
                    setPayments([]);
                    setError(requestError?.response?.data?.error || 'No pudimos cargar el historial de pagos validados.');
                }
            } finally {
                if (active) setLoading(false);
            }
        };
        load();
        return () => { active = false; };
    }, [reloadKey]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return payments;
        return payments.filter((payment) => [
            payment.client_name,
            payment.username,
            payment.client_document,
            payment.client_phone,
            payment.service_id,
            payment.invoice_id,
            payment.reference,
            payment.payment_id,
            payment.source,
            payment.payment_date,
            payment.payment_type_label,
            payment.method,
            payment.bank_id,
            payment.bank_name,
            payment.payer_phone,
            payment.banesco_reference,
            payment.banesco_concept,
            payment.created_at,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
    }, [payments, query]);

    const portalCount = payments.filter((item) => item.source === 'portal').length;
    const assistantCount = payments.filter((item) => item.source === 'whatsapp_bot').length;

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Finanzas"
                title="Pagos validados"
                description="Últimos 30 días. Solo se muestran validaciones realizadas por el Portal de Autogestión y el Asistente Virtual Rapidito, enriquecidas con los datos reales del cliente cuando están disponibles."
                action={(
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="secondary-action">
                        <RefreshCw size={16} /> Actualizar
                    </button>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payments.length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Portal de Autogestión · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">{portalCount}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Asistente Virtual · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-violet-300">{assistantCount}</p>
                </Surface>
            </div>

            <Surface className="p-4">
                <div className="relative max-w-2xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por cliente, usuario, referencia, factura, servicio, banco, ID de pago o fecha"
                        className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    />
                </div>
            </Surface>

            {loading ? <LoadingBlock label="Cargando pagos validados de los últimos 30 días…" /> : null}

            {!loading && error ? (
                <EmptyState
                    icon={RefreshCw}
                    title="No pudimos cargar los pagos"
                    description={error}
                    action={<button type="button" onClick={() => setReloadKey((value) => value + 1)} className="secondary-action"><RefreshCw size={16} /> Reintentar</button>}
                />
            ) : null}

            {!loading && !error ? (
                <Surface className="overflow-hidden">
                    <div className="border-b border-white/8 p-4 sm:p-5">
                        <h2 className="flex items-center gap-2 font-semibold text-white"><CreditCard size={18} className="text-emerald-300" /> Historial detallado de validaciones</h2>
                        <p className="mt-1 text-xs text-slate-500">{filtered.length} registro{filtered.length === 1 ? '' : 's'} mostrado{filtered.length === 1 ? '' : 's'}</p>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No se encontraron pagos validados por el Portal de Autogestión o el Asistente Virtual en los últimos 30 días.</div>
                    ) : (
                        <div className="divide-y divide-white/6">
                            {filtered.map((payment) => {
                                const fromBot = payment.source === 'whatsapp_bot';
                                const SourceIcon = fromBot ? Smartphone : Globe2;
                                const reference = payment.reference || payment.payment_id || '—';
                                const sourceName = fromBot ? 'Asistente Virtual Rapidito' : 'Portal de Autogestión';
                                const clientName = payment.client_name || payment.username || 'Cliente sin identificar';
                                const bank = [payment.bank_id, payment.bank_name].filter(hasValue).join(' · ');
                                const modality = payment.payment_type_label || payment.method;
                                const bankAmount = hasValue(payment.banesco_amount)
                                    ? formatAmount(payment.banesco_amount, payment.currency || 'VES')
                                    : '';

                                return (
                                    <div key={payment.id || `${payment.source}-${payment.invoice_id}-${reference}`} className="p-4 sm:p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-lg font-semibold text-white">{clientName}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Factura #{payment.invoice_id || '—'} · Ref. {reference}{payment.service_id ? ` · Servicio #${payment.service_id}` : ''}
                                                </p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${fromBot ? 'border-violet-400/20 bg-violet-400/8 text-violet-200' : 'border-cyan-400/20 bg-cyan-400/8 text-cyan-200'}`}>
                                                        <SourceIcon size={14} /> {sourceName}
                                                    </span>
                                                    <StatusPill tone="success">Validado</StatusPill>
                                                </div>
                                            </div>
                                            <div className="lg:text-right">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">Monto validado</p>
                                                <p className="mt-1 text-xl font-bold text-white">{formatAmount(payment.amount, payment.currency)}</p>
                                                <p className="mt-1 text-xs text-slate-500">Pago: {payment.payment_date || payment.created_at?.slice(0, 10) || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            <DetailCell label="Cliente" value={clientName} />
                                            <DetailCell label="Usuario" value={payment.username} mono />
                                            <DetailCell label="Cédula / Documento" value={payment.client_document} mono />
                                            <DetailCell label="Teléfono del cliente" value={payment.client_phone} mono />
                                            <DetailCell label="Servicio" value={hasValue(payment.service_id) ? `#${payment.service_id}` : ''} mono />
                                            <DetailCell label="Factura" value={hasValue(payment.invoice_id) ? `#${payment.invoice_id}` : ''} mono />
                                            <DetailCell label="ID de pago" value={payment.payment_id} mono />
                                            <DetailCell label="Referencia reportada" value={payment.reference} mono />
                                            <DetailCell label="Monto" value={formatAmount(payment.amount, payment.currency)} />
                                            <DetailCell label="Fecha del pago" value={payment.payment_date} mono />
                                            <DetailCell label="Fecha de validación" value={formatDateTime(payment.created_at)} />
                                            <DetailCell label="Modalidad" value={modality} />
                                            <DetailCell label="Banco de origen" value={bank} />
                                            <DetailCell label="Teléfono emisor" value={payment.payer_phone} mono />
                                            <DetailCell label="Referencia confirmada por Banesco" value={payment.banesco_reference} mono />
                                            <DetailCell label="Monto confirmado por Banesco" value={bankAmount} />
                                            <DetailCell label="Fecha Banesco" value={payment.banesco_date} mono />
                                            <DetailCell label="Concepto Banesco" value={payment.banesco_concept} />
                                            <DetailCell label="Estado Banesco" value={humanStatus(payment.banesco_status, 'Validado')} />
                                            <DetailCell label="Registro de factura" value={humanStatus(payment.wisphub_status, 'Registrado')} />
                                            <DetailCell label="ID de tarea" value={payment.wisphub_task_id} mono />
                                            <DetailCell label="Registro interno" value={payment.id} mono />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Surface>
            ) : null}
        </div>
    );
};

export default ValidatedPayments;
