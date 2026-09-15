import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Globe2, RefreshCw, Search, Smartphone } from 'lucide-react';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

const VALIDATED_SOURCES = new Set(['portal', 'whatsapp_bot']);
const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';
const textKey = (value) => String(value ?? '').trim().toLowerCase();

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
                const response = await api.get('/validated_payments.php?limit=2000', {
                    withCredentials: true,
                    timeout: 30000,
                    headers: { 'Cache-Control': 'no-cache' },
                });
                const rows = Array.isArray(response?.data?.payments) ? response.data.payments : [];
                if (active) setPayments(rows.filter((row) => VALIDATED_SOURCES.has(row?.source)));
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
            payment.client_id,
            payment.client_document,
            payment.client_phone,
            payment.client_email,
            payment.client_address,
            payment.plan,
            payment.node,
            payment.service_id,
            payment.invoice_id,
            payment.reference,
            payment.payment_id,
            payment.payment_date,
            payment.payment_type_label,
            payment.method,
            payment.registered_method,
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
                description="Últimos 30 días. Solo Portal de Autogestión y Asistente Virtual Rapidito. Cada registro muestra la identidad real del cliente vinculada al pago y todos los datos disponibles de la validación."
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
                <div className="relative max-w-3xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por cliente, cédula, teléfono, usuario, referencia, factura, servicio, banco o fecha"
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
                        <div className="p-8 text-center text-sm text-slate-500">No se encontraron pagos validados por el Portal de Autogestión o el Asistente Virtual Rapidito en los últimos 30 días.</div>
                    ) : (
                        <div className="divide-y divide-white/6">
                            {filtered.map((payment) => {
                                const fromBot = payment.source === 'whatsapp_bot';
                                const SourceIcon = fromBot ? Smartphone : Globe2;
                                const sourceName = fromBot ? 'Asistente Virtual Rapidito' : 'Portal de Autogestión';
                                const reference = payment.reference || payment.banesco_reference || payment.payment_id || '—';
                                const clientName = payment.client_name || payment.username || 'Cliente no vinculado';
                                const bank = [payment.bank_id, payment.bank_name].filter(hasValue).join(' · ');
                                const modality = payment.payment_type_label || payment.method || payment.registered_method;
                                const bankAmount = hasValue(payment.banesco_amount)
                                    ? formatAmount(payment.banesco_amount, payment.currency || 'VES')
                                    : '';

                                return (
                                    <div key={payment.id || `${payment.source}-${payment.invoice_id}-${reference}`} className="p-4 sm:p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-lg font-semibold text-white">{clientName}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {payment.invoice_id ? `Factura #${payment.invoice_id}` : 'Factura no disponible'} · Ref. {reference}{payment.service_id ? ` · Servicio #${payment.service_id}` : ''}
                                                </p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${fromBot ? 'border-violet-400/20 bg-violet-400/8 text-violet-200' : 'border-cyan-400/20 bg-cyan-400/8 text-cyan-200'}`}>
                                                        <SourceIcon size={14} /> {sourceName}
                                                    </span>
                                                    <StatusPill tone="success">Validado</StatusPill>
                                                    {payment.client_resolved === false ? <StatusPill tone="warning">Cliente pendiente de vincular</StatusPill> : null}
                                                </div>
                                            </div>
                                            <div className="lg:text-right">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">Monto validado</p>
                                                <p className="mt-1 text-xl font-bold text-white">{formatAmount(payment.amount, payment.currency)}</p>
                                                <p className="mt-1 text-xs text-slate-500">Pago: {payment.payment_date || payment.created_at?.slice(0, 10) || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            <DetailCell label="Cliente" value={payment.client_name || payment.username} />
                                            <DetailCell label="ID cliente" value={payment.client_id} mono />
                                            <DetailCell label="Usuario" value={payment.username} mono />
                                            <DetailCell label="Cédula / RIF" value={payment.client_document} mono />
                                            <DetailCell label="Teléfono cliente" value={payment.client_phone} mono />
                                            <DetailCell label="Correo" value={payment.client_email} />
                                            <DetailCell label="Dirección" value={payment.client_address} />
                                            <DetailCell label="Plan" value={payment.plan} />
                                            <DetailCell label="Nodo / Zona" value={payment.node} />
                                            <DetailCell label="Estado del servicio" value={payment.client_status} />
                                            <DetailCell label="Servicio" value={hasValue(payment.service_id) ? `#${payment.service_id}` : ''} mono />
                                            <DetailCell label="Factura" value={hasValue(payment.invoice_id) ? `#${payment.invoice_id}` : ''} mono />
                                            <DetailCell label="ID de pago" value={payment.payment_id} mono />
                                            <DetailCell label="Referencia reportada" value={payment.reference} mono />
                                            <DetailCell label="Monto reportado" value={formatAmount(payment.amount, payment.currency)} />
                                            <DetailCell label="Fecha del pago" value={payment.payment_date} mono />
                                            <DetailCell label="Fecha de validación" value={formatDateTime(payment.created_at)} />
                                            <DetailCell label="Modalidad" value={modality} />
                                            <DetailCell label="Método registrado" value={payment.registered_method} />
                                            <DetailCell label="Banco de origen" value={bank} />
                                            <DetailCell label="Teléfono emisor" value={payment.payer_phone} mono />
                                            <DetailCell label="Referencia confirmada" value={payment.banesco_reference} mono />
                                            <DetailCell label="Monto confirmado" value={bankAmount} />
                                            <DetailCell label="Fecha bancaria" value={payment.banesco_date} mono />
                                            <DetailCell label="Concepto bancario" value={payment.banesco_concept} />
                                            <DetailCell label="Estado de validación" value={humanStatus(payment.banesco_status, 'Validado')} />
                                            <DetailCell label="Estado de registro" value={humanStatus(payment.wisphub_status, 'Registrado')} />
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
