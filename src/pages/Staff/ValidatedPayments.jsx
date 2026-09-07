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
                const response = await api.get('/payment_audit.php?limit=300', {
                    withCredentials: true,
                    timeout: 15000,
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
            payment.source,
            payment.payment_date,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle)));
    }, [payments, query]);

    return (
        <div className="space-y-6 pb-4">
            <PageHeading
                eyebrow="Finanzas"
                title="Pagos validados"
                description="Historial de pagos verificados automáticamente por Banesco y registrados en WispHub desde el portal y el asistente virtual."
                action={(
                    <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="secondary-action">
                        <RefreshCw size={16} /> Actualizar
                    </button>
                )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Total validados</p>
                    <p className="mt-2 text-2xl font-bold text-white">{payments.length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Portal</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">{payments.filter((item) => item.source === 'portal').length}</p>
                </Surface>
                <Surface className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Asistente virtual</p>
                    <p className="mt-2 text-2xl font-bold text-violet-300">{payments.filter((item) => item.source === 'whatsapp_bot').length}</p>
                </Surface>
            </div>

            <Surface className="p-4">
                <div className="relative max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar cliente, factura, referencia o servicio"
                        className="glass-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                    />
                </div>
            </Surface>

            {loading ? <LoadingBlock label="Cargando pagos validados…" /> : null}

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
                        <h2 className="flex items-center gap-2 font-semibold text-white"><CreditCard size={18} className="text-emerald-300" /> Historial</h2>
                        <p className="mt-1 text-xs text-slate-500">{filtered.length} registro{filtered.length === 1 ? '' : 's'} mostrado{filtered.length === 1 ? '' : 's'}</p>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No hay pagos automáticos registrados todavía.</div>
                    ) : (
                        <div className="divide-y divide-white/6">
                            {filtered.map((payment) => {
                                const fromBot = payment.source === 'whatsapp_bot';
                                const SourceIcon = fromBot ? Smartphone : Globe2;
                                const amount = Number(payment.amount);
                                return (
                                    <div key={payment.id || `${payment.source}-${payment.invoice_id}-${payment.reference}`} className="grid gap-4 p-4 sm:grid-cols-[1.4fr_.7fr_.7fr_.8fr_auto] sm:items-center sm:px-5">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{payment.client_name || payment.username || 'Cliente'}</p>
                                            <p className="mt-1 truncate text-xs text-slate-500">Factura #{payment.invoice_id || '—'} · Ref. {payment.reference || '—'}{payment.service_id ? ` · Servicio #${payment.service_id}` : ''}</p>
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
                                            {fromBot ? 'Asistente virtual' : 'Portal'}
                                        </div>
                                        <StatusPill tone="success">Validado</StatusPill>
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
