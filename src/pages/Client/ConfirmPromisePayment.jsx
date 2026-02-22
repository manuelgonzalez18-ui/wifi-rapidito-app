import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Phone, Upload, Send, User, ShieldCheck, AlertCircle } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const ConfirmPromisePayment = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        telefono: user?.telefono || '',
        comentario: '',
        comprobante: null
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('El archivo no debe superar los 10MB');
                return;
            }
            setFormData({ ...formData, comprobante: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.telefono) {
            toast.error('Por favor, ingresa tu número de teléfono');
            return;
        }

        if (!formData.comprobante) {
            toast.error('Por favor, adjunta el comprobante de pago');
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

            if (response.ok) {
                toast.success('Pago reportado con éxito. Validaremos a la brevedad.');
                setFormData({
                    telefono: user?.telefono || '',
                    comentario: '',
                    comprobante: null
                });
            } else {
                const res = await response.json();
                throw new Error(res.error || 'Error de envío');
            }
        } catch (error) {
            toast.error(error.message || 'Error al enviar el reporte de pago');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white neon-text mb-2 tracking-tighter uppercase">
                        Confirmar Pago
                    </h1>
                    <p className="text-slate-400 text-xs tracking-widest font-mono opacity-60 uppercase">
                        :: Reportar cumplimiento de promesa de pago ::
                    </p>
                </div>
                <div className="p-3 glass-panel border-green-500/30 bg-green-500/5 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <CheckSquare className="text-green-400 w-8 h-8" strokeWidth={1.5} />
                </div>
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-panel p-8 rounded-3xl border-white/5 relative overflow-hidden group shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-green-500/20 rounded-tl-3xl group-hover:border-green-500/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-green-500/20 rounded-br-3xl group-hover:border-green-500/40 transition-colors" />

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-green-500/50 uppercase tracking-[0.2em] ml-1">
                                Usuario
                            </label>
                            <div className="bg-green-950/20 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-3 text-slate-300">
                                <User size={18} className="text-green-400/50" />
                                <span className="font-medium text-sm">{user?.nombre || user?.name || 'Cargando...'}</span>
                            </div>
                        </div>

                        <Input
                            label="Teléfono"
                            icon={Phone}
                            placeholder="Tu número de contacto"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-green-500/50 ml-1 uppercase tracking-[0.2em]">
                            ¿Algún comentario adicional? (Opcional)
                        </label>
                        <textarea
                            className="w-full bg-[#0a1120] border border-white/10 rounded-2xl px-5 py-4 text-slate-300 focus:outline-none focus:border-green-500/50 transition-all resize-none h-28 text-sm placeholder:text-slate-600"
                            placeholder="Escribe aquí si tienes algo que decir sobre tu pago..."
                            value={formData.comentario}
                            onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-green-500/50 uppercase tracking-[0.2em] ml-1">
                            Comprobante Obligatorio
                        </label>
                        <div className="relative group cursor-pointer">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept="image/*,.pdf"
                                required
                            />
                            <div className={cn(
                                "flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed transition-all duration-300",
                                formData.comprobante
                                    ? "bg-green-500/10 border-green-500/50 text-green-400"
                                    : "bg-white/5 border-white/10 text-slate-500 group-hover:border-green-500/30 group-hover:bg-green-500/5"
                            )}>
                                <Upload size={32} className={formData.comprobante ? "text-green-400" : "text-green-500/50"} />
                                <span className="text-xs font-bold uppercase tracking-widest text-white/80 text-center">
                                    {formData.comprobante ? formData.comprobante.name : "Subir Recibo de Pago"}
                                </span>
                                <span className="text-[9px] opacity-40 uppercase tracking-tighter">Imagen o PDF (Máx 10MB)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full py-6 font-display text-xs font-bold tracking-[0.3em] bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-500 hover:to-emerald-600 shadow-[0_20px_50px_rgba(34,197,94,0.2)] rounded-2xl group flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden text-white"
                            isLoading={isLoading}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                ENVIAR REPORTE DE PAGO <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </span>
                        </Button>
                    </div>
                </form>
            </motion.div>

            <div className="glass-panel p-6 rounded-2xl border-green-500/20 bg-green-500/5 flex items-start gap-4 shadow-lg shadow-green-900/10">
                <div className="p-2 bg-green-500/20 rounded-lg">
                    <ShieldCheck className="text-green-400 w-6 h-6 flex-shrink-0" />
                </div>
                <div>
                    <h4 className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Estatus de Seguridad</h4>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        Una vez enviado, el administrador procesará tu pago y actualizará tu estatus en Wisphub. Tu conexión se reestablecerá automáticamente al validar el abono.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmPromisePayment;
