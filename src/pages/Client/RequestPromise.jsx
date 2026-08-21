import { useState } from 'react';
import { CalendarDays, Handshake, Paperclip, Phone, Send, UserRound, AlertCircle } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import toast from 'react-hot-toast';
import { PageHeading, Surface } from '../../components/ui/ClientUi';

const RequestPromise = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        telefono: user?.telefono || '',
        tipo: 'Promesa de Pago',
        fecha: '',
        comprobante: null
    });

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo no debe superar los 5 MB');
            return;
        }

        setFormData((current) => ({ ...current, comprobante: file }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        const data = new FormData();
        data.append('usuario', user?.name || user?.nombre || 'Cliente');
        data.append('telefono', formData.telefono);
        data.append('tipo', formData.tipo);
        data.append('fecha', formData.fecha);
        if (formData.comprobante) data.append('comprobante', formData.comprobante);

        try {
            const response = await fetch('/send_promise.php', {
                method: 'POST',
                body: data
            });

            if (!response.ok) throw new Error('Error al enviar');

            toast.success('Solicitud de promesa enviada correctamente');
            setFormData({
                telefono: user?.telefono || '',
                tipo: 'Promesa de Pago',
                fecha: '',
                comprobante: null
            });
        } catch (error) {
            console.error('Promise request error:', error);
            toast.error('No pudimos enviar tu solicitud. Intenta nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
            <PageHeading
                eyebrow="Gestiones"
                title="Promesa de pago"
                description="Indica la fecha en la que te comprometes a realizar el pago. Puedes adjuntar un comprobante si lo necesitas."
            />

            <Surface className="p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 rounded-xl border border-white/8 bg-black/10 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                        <Handshake size={19} />
                    </span>
                    <div>
                        <p className="font-semibold text-white">Solicitud asociada a tu cuenta</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Enviaremos tu nombre y teléfono junto con la fecha seleccionada para que el equipo pueda gestionar la promesa.
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
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Tipo de solicitud</label>
                            <div className="flex min-h-12 items-center rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm font-medium text-slate-300">
                                Promesa de pago
                            </div>
                        </div>

                        <div>
                            <label htmlFor="promise-date" className="mb-2 block text-sm font-semibold text-slate-300">Fecha de la promesa</label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="promise-date"
                                    type="date"
                                    value={formData.fecha}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
                                    className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Comprobante opcional</label>
                        <input id="promise-file" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
                        <label
                            htmlFor="promise-file"
                            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-cyan-400/20 hover:text-slate-200"
                        >
                            <Paperclip size={18} className="shrink-0 text-cyan-300" />
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-300">{formData.comprobante?.name || 'Adjuntar imagen o PDF'}</span>
                                <span className="mt-0.5 block text-xs text-slate-600">Máximo 5 MB</span>
                            </span>
                        </label>
                    </div>

                    <button type="submit" disabled={isLoading} className="primary-action w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52">
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={17} />}
                        {isLoading ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                </form>
            </Surface>

            <Surface className="flex items-start gap-3 border-amber-400/15 bg-amber-400/[0.04] p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div>
                    <p className="font-semibold text-amber-100">Importante</p>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                        La promesa de pago es una solicitud administrativa distinta al reporte de pago Banesco. Su recepción no equivale a un pago confirmado.
                    </p>
                </div>
            </Surface>
        </div>
    );
};

export default RequestPromise;
