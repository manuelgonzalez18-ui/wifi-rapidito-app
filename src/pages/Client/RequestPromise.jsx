import { useState } from 'react';
import { motion } from 'framer-motion';
import { Handshake, Phone, Calendar, Upload, Send, User, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const RequestPromise = () => {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        telefono: user?.telefono || '',
        tipo: 'Promesa de Pago',
        fecha: '',
        comprobante: null
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('El archivo no debe superar los 5MB');
                return;
            }
            setFormData({ ...formData, comprobante: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // VALIDACIÓN: Ya no es obligatorio el comprobante
        setIsLoading(true);

        const data = new FormData();
        data.append('usuario', user?.name || user?.nombre || 'Cliente');
        data.append('telefono', formData.telefono);
        data.append('tipo', formData.tipo);
        data.append('fecha', formData.fecha);
        if (formData.comprobante) {
            data.append('comprobante', formData.comprobante);
        }

        try {
            const response = await fetch('/send_promise.php', {
                method: 'POST',
                body: data
            });

            if (response.ok) {
                toast.success('Solicitud enviada correctamente');
                setFormData({
                    telefono: user?.telefono || '',
                    tipo: 'Promesa de Pago',
                    fecha: '',
                    comprobante: null
                });
            } else {
                throw new Error('Error al enviar');
            }
        } catch (error) {
            toast.error('Hubo un problema al enviar tu solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white neon-text mb-2 tracking-tighter uppercase">
                        Solicitar Promesa
                    </h1>
                    <p className="text-slate-400 text-xs tracking-widest font-mono opacity-60 uppercase">
                        :: Compromiso de pago o abono administrativo ::
                    </p>
                </div>
                <div className="p-3 glass-panel border-cyan-500/30 bg-cyan-500/5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                    <Handshake className="text-cyan-400 w-8 h-8" strokeWidth={1.5} />
                </div>
            </div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="glass-panel p-8 rounded-3xl border-white/5 relative overflow-hidden group shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-3xl group-hover:border-cyan-500/40 transition-colors" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/20 rounded-br-3xl group-hover:border-cyan-500/40 transition-colors" />

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-[0.2em] ml-1">
                                Usuario Solicitante
                            </label>
                            <div className="bg-cyan-950/20 border border-white/5 rounded-2xl px-5 py-4 flex items-center gap-3 text-slate-300">
                                <User size={18} className="text-cyan-400/50" />
                                <span className="font-medium text-sm">{user?.name || user?.nombre || 'Cargando...'}</span>
                            </div>
                        </div>

                        <Input
                            label="Teléfono de Contacto"
                            icon={Phone}
                            placeholder="Ej: 04121234567"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 text-left text-white">
                            <label className="block text-[10px] font-bold text-cyan-500/50 ml-1 uppercase tracking-[0.2em]">
                                Tipo de Solicitud
                            </label>
                            <div className="relative">
                                <select
                                    className="glass-input w-full rounded-2xl px-5 py-4 text-xs font-bold pr-10 appearance-none bg-[#0a1120] outline-none focus:border-cyan-500/50 transition-all cursor-pointer border border-white/10"
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                    required
                                >
                                    <option value="Promesa de Pago">SÓLO PROMESA DE PAGO</option>
                                    <option value="Abono Mas Promesa de Pago">ABONO + PROMESA DE PAGO</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-500/50">
                                    <CheckCircle2 size={16} />
                                </div>
                            </div>
                        </div>

                        <Input
                            type="date"
                            label="Fecha de la Promesa"
                            icon={Calendar}
                            value={formData.fecha}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                            onClick={(e) => e.target.showPicker && e.target.showPicker()}
                            required
                        />
                    </div>

                    {/* Mensaje Informativo Condicional */}
                    {formData.tipo === 'Abono Mas Promesa de Pago' && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-start gap-3"
                        >
                            <AlertCircle className="text-cyan-400 shrink-0" size={18} />
                            <p className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider leading-relaxed">
                                Cargue su comprobante de pago si va a solicitar abono mas promesa de pago.
                            </p>
                        </motion.div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-[0.2em] ml-1">
                            Comprobante de Pago (Opcional)
                        </label>
                        <div className="relative group cursor-pointer">
                            <input
                                type="file"
                                id="receipt"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                accept="image/*,.pdf"
                            />
                            <div className={cn(
                                "flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed transition-all duration-300",
                                formData.comprobante
                                    ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-400"
                                    : "bg-white/5 border-white/10 text-slate-500 group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5"
                            )}>
                                <Upload size={24} className={formData.comprobante ? "text-emerald-400" : "text-cyan-400"} />
                                <span className="text-xs font-bold uppercase tracking-widest text-white/80">
                                    {formData.comprobante ? formData.comprobante.name : "Subir archivo o foto del recibo"}
                                </span>
                                <span className="text-[9px] opacity-40 uppercase tracking-tighter">PDF o Imagen (Máx 5MB)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full py-6 font-display text-xs font-bold tracking-[0.3em] bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 shadow-[0_20px_50px_rgba(0,100,200,0.3)] rounded-2xl group flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden"
                            isLoading={isLoading}
                        >
                            <span className="relative z-10 flex items-center gap-3">
                                ENVIAR SOLICITUD A ADMIN <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </span>
                        </Button>
                    </div>
                </form>
            </motion.div>

            <div className="glass-panel p-6 rounded-2xl border-amber-500/20 bg-amber-500/5 flex items-start gap-4 shadow-lg shadow-amber-900/10">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                    <ShieldCheck className="text-amber-400 w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Nota importante</h4>
                    <p className="text-slate-400 text-xs leading-relaxed font-medium">
                        El envío de esta solicitud no garantiza la reactivación inmediata. El administrador revisará y validará tu caso manualmente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RequestPromise;
