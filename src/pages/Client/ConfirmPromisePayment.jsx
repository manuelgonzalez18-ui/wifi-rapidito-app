import { useState } from 'react';
import { CheckCircle2, MessageSquareText, Paperclip, Phone, Send, UserRound, AlertCircle } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import toast from 'react-hot-toast';
import { PageHeading, Surface } from '../../components/ui/ClientUi';

const ConfirmPromisePayment = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        telefono: user?.telefono || '',
        comentario: '',
        comprobante: null
    });

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('El archivo no debe superar los 10 MB');
            return;
        }

        setFormData((current) => ({ ...current, comprobante: file }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!formData.telefono) {
            toast.error('Ingresa tu número de teléfono');
            return;
        }

        if (!formData.comprobante) {
            toast.error('Adjunta el comprobante de pago');
            return;
        }

        setIsLoading(true);
        const data = new FormData();
        data.append('usuario', user?.name || user?.nombre || 'Cliente');
        data.append('id_servicio', user?.id_servicio || '');
        data.append('cedula', user?.cedula || '');
        data.append('telefono', formData.telefono);
        data.append('comentario', formData.comentario);
        data.append('comprobante', formData.comprobante);

        try {
            const response = await fetch('/send_confirmation.php', {
                method: 'POST',
                body: data
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error || 'Error de envío');
            }

            toast.success('Comprobante enviado correctamente');
            setFormData({
                telefono: user?.telefono || '',
                comentario: '',
                comprobante: null
            });
        } catch (error) {
            console.error('Promise payment confirmation error:', error);
            toast.error(error.message || 'No pudimos enviar el comprobante');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
            <PageHeading
                eyebrow="Promesa de pago"
                title="Confirmar cumplimiento"
                description="Si realizaste un pago asociado a una promesa, envía el comprobante y tus datos de contacto para su gestión."
            />

            <Surface className="p-5 sm:p-7">
                <div className="mb-6 flex items-start gap-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                        <CheckCircle2 size={19} />
                    </span>
                    <div>
                        <p className="font-semibold text-white">Comprobante de una promesa</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                            Esta gestión es independiente del formulario de validación Banesco disponible en la sección Reportar pago.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-300">Cliente</label>
                            <div className="flex min-h-12 items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] px-4 text-sm text-slate-300">
                                <UserRound size={17} className="text-slate-500" />
                                <span className="truncate">{user?.nombre || user?.name || 'Cliente'}</span>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmation-phone" className="mb-2 block text-sm font-semibold text-slate-300">Teléfono</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="confirmation-phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={formData.telefono}
                                    onChange={(event) => setFormData({ ...formData, telefono: event.target.value })}
                                    placeholder="Tu número de contacto"
                                    className="glass-input w-full rounded-xl py-3 pl-11 pr-4 text-sm"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="confirmation-comment" className="mb-2 block text-sm font-semibold text-slate-300">Comentario opcional</label>
                        <div className="relative">
                            <MessageSquareText className="absolute left-4 top-4 h-4 w-4 text-slate-500" />
                            <textarea
                                id="confirmation-comment"
                                value={formData.comentario}
                                onChange={(event) => setFormData({ ...formData, comentario: event.target.value })}
                                placeholder="Agrega alguna información que ayude a identificar tu caso."
                                rows={4}
                                className="glass-input w-full resize-none rounded-xl py-3 pl-11 pr-4 text-sm leading-6"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-300">Comprobante de pago</label>
                        <input id="confirmation-file" type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} required />
                        <label
                            htmlFor="confirmation-file"
                            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/12 bg-white/[0.025] px-4 text-sm text-slate-400 transition hover:border-emerald-400/20 hover:text-slate-200"
                        >
                            <Paperclip size={18} className="shrink-0 text-emerald-300" />
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-300">{formData.comprobante?.name || 'Adjuntar imagen o PDF'}</span>
                                <span className="mt-0.5 block text-xs text-slate-600">Obligatorio · máximo 10 MB</span>
                            </span>
                        </label>
                    </div>

                    <button type="submit" disabled={isLoading} className="primary-action w-full py-3.5 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52">
                        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={17} />}
                        {isLoading ? 'Enviando…' : 'Enviar comprobante'}
                    </button>
                </form>
            </Surface>

            <Surface className="flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <p className="text-sm leading-6 text-slate-400">
                    Para un pago que deba validarse directamente con Banesco y registrarse automáticamente en WispHub, utiliza la opción “Reportar pago” del menú principal.
                </p>
            </Surface>
        </div>
    );
};

export default ConfirmPromisePayment;
