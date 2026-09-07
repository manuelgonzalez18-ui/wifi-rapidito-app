import { useEffect, useMemo, useState } from 'react';
import { CreditCard, Globe2, RefreshCw, Search, Smartphone } from 'lucide-react';
import api from '../../api/client';
import { EmptyState, LoadingBlock, PageHeading, StatusPill, Surface } from '../../components/ui/ClientUi';

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
                if (active) setPayments(Array.isArray(response?.data?.payments) ? response.data.payments : []);
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
            payment.service_id,
            payment.invoice_id,
            payment.reference,
            payment.payment_id,
            payment.source,
            payment.payment_date,
            payment.method,
            payment.created_at,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
    }, [payments, query]);

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Finanzas"
                title="Pagos validados"
                description="Resultados de los últimos 30 días: pagos registrados por el Portal de Autogestión, el Asistente Virtual Rapidito y los pagos disponibles en WispHub."
                action={(
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="secondary-action">
                        <RefreshCw size={16} /> Actualizar
                    </button>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payments.length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Portal · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">{payments.filter((item) => item.source === 'portal').length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Asistente virtual · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-violet-300">{payments.filter((item) => item.source === 'whatsapp_bot').length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">WispHub · 30 días</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-300">{payments.filter((item) => item.source === 'wisphub_history').length}</p>
                </Surface>
            </div>

            <Surface className="p-4">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por cliente, referencia, factura, servicio, ID de pago o fecha"
                        className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    />
                </div>
            </Surface>

            {loading ? <LoadingBlock label="Cargando pagos de los últimos 30 días…" /> : null}

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
                        <h2 className="flex items-center gap-2 font-semibold text-white"><CreditCard size={18} className="text-emerald-300" /> Historial de los últimos 30 días</h2>
                        <p className="mt-1 text-xs text-slate-500">{filtered.length} registro{filtered.length === 1 ? '' : 's'} mostrado{filtered.length === 1 ? '' : 's'}</p>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No se encontraron pagos registrados en los últimos 30 días.</div>
                    ) : (
                        <div className="divide-y divide-white/6">
                            {filtered.map((payment) => {
                                const fromBot = payment.source === 'whatsapp_bot';
                                const historical = payment.source === 'wisphub_history';
                                const SourceIcon = fromBot ? Smartphone : Globe2;
                                const amount = Number(payment.amount);
                                const reference = payment.reference || payment.payment_id || '—';
                                return (
                                    <div key={payment.id || `${payment.source}-${payment.invoice_id}-${reference}`} className="grid gap-4 p-4 sm:grid-cols-[1.4fr_.7fr_.7fr_.8fr_auto] sm:items-center sm:px-5">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{payment.client_name || payment.username || 'Cliente'}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">Factura #{payment.invoice_id || '—'} · Ref. {reference}{payment.service_id ? ` · Servicio #${payment.service_id}` : ''}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">Monto</p>
                                            <p className="mt-1 text-sm font-semibold text-slate-200">{Number.isFinite(amount) ? `Bs. ${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">Fecha</p>
                                            <p className="mt-1 text-sm text-slate-300">{payment.payment_date || payment.created_at?.slice(0, 10) || '—'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-300">
                                            <SourceIcon size={16} className={fromBot ? 'text-violet-300' : 'text-cyan-300'} />
                                            {historical ? 'WispHub' : (fromBot ? 'Asistente virtual' : 'Portal')}
                                        </div>
                                        <StatusPill tone="success">Registrado</StatusPill>
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
