import { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle,
    FileText,
    Handshake,
    Phone,
    Send,
    UserRound,
    Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../auth/authStore';
import api from '../../api/client';
import { PageHeading, Surface } from '../../components/ui/ClientUi';

const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPromiseDateWindow = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfMonth = today.getDate();

    // La ventana mensual abre el día 13 y se mantiene disponible
    // hasta el día 5 del mes siguiente. Del 6 al 12 está cerrada.
    const isOpen = dayOfMonth >= 13 || dayOfMonth <= 5;
    const maxDate = dayOfMonth <= 5
        ? new Date(today.getFullYear(), today.getMonth(), 5)
        : new Date(today.getFullYear(), today.getMonth() + 1, 5);
    const nextOpenDate = dayOfMonth >= 6 && dayOfMonth <= 12
        ? new Date(today.getFullYear(), today.getMonth(), 13)
        : null;

    return {
        isOpen,
        min: toInputDate(today),
        max: toInputDate(maxDate),
        maxDate,
        nextOpenDate,
    };
};

const isPendingInvoice = (invoice) => {
    const status = String(invoice?.estado ?? '').toLowerCase().trim();
    return (
        status.includes('pendiente') ||
        status.includes('por_pagar') ||
        status.includes('por pagar') ||
        status.includes('unpaid') ||
        invoice?.estado === 2 ||
        status === '2'
    );
};

const RequestPromise = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
    const [pendingInvoices, setPendingInvoices] = useState([]);
    const [success, setSuccess] = useState(false);
    const [registeredDate, setRegisteredDate] = useState('');
    const [formData, setFormData] = useState({
        telefono: user?.telefono || '',
        fecha: '',
        comentarios: '',
        id_factura: '',
    });

    const promiseWindow = useMemo(() => getPromiseDateWindow(), []);

    useEffect(() => {
        setFormData((current) => ({
            ...current,
            telefono: current.telefono || user?.telefono || '',
        }));
    }, [user?.telefono]);

    useEffect(() => {
        let cancelled = false;

        const loadPendingInvoices = async () => {
            setIsLoadingInvoices(true);

            try {
                const queries = [
                    user?.id_servicio ? api.get(`/facturas/?id_servicio=${user.id_servicio}&limit=50`) : null,
                    user?.id_servicio ? api.get(`/facturas/?servicio=${user.id_servicio}&limit=50`) : null,
                    user?.usuario ? api.get(`/facturas/?cliente=${user.usuario}&limit=50`) : null,
                ].filter(Boolean);

                if (queries.length === 0) {
                    if (!cancelled) {
                        setPendingInvoices([]);
                        setFormData((current) => ({ ...current, id_factura: '' }));
                    }
                    return;
                }

                const responses = await Promise.allSettled(queries);
                const uniqueInvoices = new Map();

                responses.forEach((response) => {
                    if (response.status !== 'fulfilled') return;

                    const payload = response.value.data;
                    const invoices = Array.isArray(payload?.results)
                        ? payload.results
                        : Array.isArray(payload)
                            ? payload
                            : [];

                    invoices.forEach((invoice) => {
                        if (!isPendingInvoice(invoice)) return;

                        const internalId = invoice.id_factura || invoice.id;
                        if (!internalId) return;

                        uniqueInvoices.set(String(internalId), {
                            ...invoice,
                            _internalId: internalId,
                            _displayId: invoice.folio || internalId,
                        });
                    });
                });

                const invoices = Array.from(uniqueInvoices.values()).sort(
                    (a, b) => Number(b._internalId || 0) - Number(a._internalId || 0),
                );

                if (!cancelled) {
                    setPendingInvoices(invoices);
                    setFormData((current) => ({
                        ...current,
                        id_factura: invoices.length === 1 ? String(invoices[0]._internalId) : '',
                    }));
                }
            } catch (error) {
                console.error('Error checking pending invoices:', error);
                if (!cancelled) {
                    setPendingInvoices([]);
                    setFormData((current) => ({ ...current, id_factura: '' }));
                    toast.error('No pudimos verificar tus facturas pendientes. Intenta nuevamente.');
                }
            } finally {
                if (!cancelled) setIsLoadingInvoices(false);
            }
        };

        loadPendingInvoices();

        return () => {
            cancelled = true;
        };
    }, [user?.id_servicio, user?.usuario]);

    const hasExactlyOneInvoice = !isLoadingInvoices && pendingInvoices.length === 1;
    const hasMultipleInvoices = !isLoadingInvoices && pendingInvoices.length > 1;
    const hasNoInvoices = !isLoadingInvoices && pendingInvoices.length === 0;
    const selectedInvoice = hasExactlyOneInvoice ? pendingInvoices[0] : null;
    const canRequestPromise = promiseWindow.isOpen && hasExactlyOneInvoice;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!promiseWindow.isOpen) {
            toast.error('Las promesas de pago solo están disponibles del día 13 al día 5 del mes siguiente');
            return;
        }

        if (pendingInvoices.length > 1) {
            toast.error('No puedes solicitar promesa si tienes más de una factura pendiente');
            return;
        }

        if (!formData.id_factura || pendingInvoices.length !== 1) {
            toast.error('No se encontró una única factura pendiente válida para la promesa');
            return;
        }

        if (!formData.telefono.trim()) {
            toast.error('Ingresa un teléfono de contacto');
            return;
        }

        if (!formData.fecha) {
            toast.error('Selecciona la fecha límite de pago');
            return;
        }

        if (formData.fecha < promiseWindow.min || formData.fecha > promiseWindow.max) {
            toast.error('La fecha seleccionada debe estar dentro de la ventana permitida y nunca superar el día 5');
            return;
        }

        const invoiceId = Number.parseInt(formData.id_factura, 10);
        if (!Number.isFinite(invoiceId)) {
            toast.error('La factura seleccionada no es válida');
            return;
        }

        setIsLoading(true);

        const payload = {
            id_factura: invoiceId,
            fecha_limite: formData.fecha,
            comentarios: formData.comentarios.trim(),
            accion: 1,
        };

        try {
            await api.post('/promesas-de-pago/', payload);
            setRegisteredDate(formData.fecha);
            setSuccess(true);
            toast.success('¡Promesa registrada! Tu servicio será activado automáticamente.');
        } catch (error) {
            console.error('Promise registration error:', error);
            const responseData = error.response?.data;
            const apiMessage =
                responseData?.error ||
                responseData?.detail ||
                responseData?.message ||
                (responseData && typeof responseData === 'object' ? JSON.stringify(responseData) : null);

            toast.error(apiMessage || 'Hubo un problema al registrar tu promesa de pago');
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="mx-auto max-w-3xl space-y-6 pb-4">
                <PageHeading
                    eyebrow="Gestiones"
                    title="Promesa registrada"
                    description="WispHub recibió tu compromiso de pago y el proceso de activación automática fue solicitado."
                />

                <Surface className="p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                            <CheckCircle size={30} />
                        </span>
                        <h2 className="mt-5 text-xl font-semibold text-white">Compromiso registrado correctamente</h2>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                            Tu fecha límite es <strong className="text-slate-200">{new Date(`${registeredDate}T12:00:00`).toLocaleDateString()}</strong>.
                            Si tu servicio estaba suspendido, WispHub procesará la activación asociada a esta promesa.
                        </p>
                    </div>
                </Surface>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
            <PageHeading
                eyebrow="Gestiones"
                title="Promesa de pago"
                description="Disponible desde el día 13 de cada mes hasta el día 5 del mes siguiente. El sistema registra la promesa directamente en WispHub."
            />

            {!promiseWindow.isOpen && (
                <Surface className="flex items-start gap-3 border-amber-400/20 bg-amber-400/[0.05] p-4">
                    <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">Ventana de promesas cerrada</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Las solicitudes se habilitan el día 13 de cada mes y pueden registrarse hasta el día 5 del mes siguiente.
                            {promiseWindow.nextOpenDate && (
                                <> La próxima apertura será el <strong className="text-slate-200">{promiseWindow.nextOpenDate.toLocaleDateString()}</strong>.</>
                            )}
                        </p>
                    </div>
                </Surface>
            )}

            {hasMultipleInvoices && (
                <Surface className="flex items-start gap-3 border-red-400/20 bg-red-400/[0.05] p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                    <div>
                        <p className="font-semibold text-red-100">Promesa no disponible</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Tienes <strong className="text-slate-200">{pendingInvoices.length} facturas pendientes</strong>. La promesa automática solo puede registrarse cuando existe una única factura pendiente.
                        </p>
                    </div>
                </Surface>
            )}

            {hasNoInvoices && (
                <Surface className="flex items-start gap-3 border-amber-400/15 bg-amber-400/[0.04] p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                    <div>
                        <p className="font-semibold text-amber-100">No encontramos una factura pendiente</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            La promesa automática necesita una factura pendiente asociada a tu servicio para poder continuar.
                        </p>
                    </div>
                </Surface>
            )}

            <Surface className={`p-5 sm:p-7 ${!canRequestPromise ? 'opacity-60' : ''}`}>
                <div className="mb-6 flex items-start gap-4 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.035] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                        <Handshake size={19} />
                    </span>
                    <div>
                        <p className="font-semibold text-white">Compromiso con activación automática</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Al registrar la promesa, WispHub asociará la fecha a tu factura pendiente y procesará la acción automática del servicio.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Cliente</label>
                            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-300">
                                <UserRound size={17} className="text-slate-500" />
                                <span className="truncate">{user?.name || user?.nombre || 'Cliente'}</span>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="promise-phone" className="mb-2 block text-sm font-semibold text-slate-300">Teléfono de contacto</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="promise-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={formData.telefono}
                                    onChange={(event) => setFormData({ ...formData, telefono: event.target.value })}
                                    placeholder="Ej. 04121234567"
                                    className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
                                    required
                                    disabled={!canRequestPromise || isLoading}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Factura a comprometer</label>
                            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-300">
                                <FileText size={17} className="text-cyan-300/60" />
                                <span>
                                    {isLoadingInvoices
                                        ? 'Buscando factura pendiente…'
                                        : selectedInvoice
                                            ? `Factura #${selectedInvoice._displayId}`
                                            : pendingInvoices.length > 1
                                                ? 'Múltiples facturas — bloqueado'
                                                : 'Sin factura pendiente'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Acción automática</label>
                            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] px-4 text-sm font-semibold text-cyan-200">
                                <Zap size={17} className="text-cyan-300" />
                                Registrar y activar servicio
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="promise-date" className="mb-2 block text-sm font-semibold text-slate-300">Fecha límite de pago</label>
                        <div className="relative">
                            <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                id="promise-date"
                                type="date"
                                value={formData.fecha}
                                min={promiseWindow.min}
                                max={promiseWindow.max}
                                onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
                                className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
                                required
                                disabled={!canRequestPromise || isLoading}
                            />
                        </div>
                        {promiseWindow.isOpen ? (
                            <p className="mt-2 text-xs text-amber-300/70">
                                Fecha máxima permitida: {promiseWindow.maxDate.toLocaleDateString()}. Después del día 5 la ventana se cierra hasta el día 13.
                            </p>
                        ) : (
                            <p className="mt-2 text-xs text-amber-300/70">
                                La selección de fecha estará disponible nuevamente el día 13.
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="promise-comments" className="mb-2 block text-sm font-semibold text-slate-300">Motivo o detalles (opcional)</label>
                        <textarea
                            id="promise-comments"
                            value={formData.comentarios}
                            onChange={(event) => setFormData({ ...formData, comentarios: event.target.value })}
                            placeholder="Ej. Realizaré el pago el viernes por la mañana…"
                            className="glass-input min-h-28 w-full resize-y rounded-xl px-4 py-3 text-sm"
                            disabled={!canRequestPromise || isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!canRequestPromise || !formData.fecha || isLoading}
                        className="primary-action w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-64"
                    >
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={17} />}
                        {isLoading ? 'Registrando…' : 'Registrar y activar servicio'}
                    </button>
                </form>
            </Surface>

            <Surface className="flex items-start gap-3 border-cyan-400/15 bg-cyan-400/[0.035] p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <div>
                    <p className="font-semibold text-cyan-100">Regla de la promesa</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        La ventana abre el día 13, permanece disponible hasta el día 5 del mes siguiente y se cierra del 6 al 12. La promesa no confirma un pago: registra el compromiso en WispHub y solicita la activación automática asociada.
                    </p>
                </div>
            </Surface>
        </div>
    );
};

export default RequestPromise;
