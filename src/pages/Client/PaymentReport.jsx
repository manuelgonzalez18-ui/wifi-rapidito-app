import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, CreditCard, Send, Upload, CheckCircle,
    AlertCircle, Calendar, Hash, DollarSign, Landmark, ChevronDown, Share2
} from 'lucide-react';
import useAuthStore from '../../auth/authStore';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const PaymentReport = () => {
    const [searchParams] = useSearchParams();
    const invoiceIdParam = searchParams.get('invoice');
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [wisphubSuccess, setWisphubSuccess] = useState(false);

    const [formData, setFormData] = useState({
        // CORRECCIÓN: Usar siempre user.usuario (ej. "correo@dominio.com") para Wisphub
        user_name: user?.usuario || user?.usuario_portal || user?.name || '',
        phone: user?.telefono || '',
        invoice_id: invoiceIdParam || '',
        amount: '',
        reference: '',
        forma_pago: '16749', // Default: Transferencia Bancaria (WispHub ID)
        payment_date: new Date().toISOString().split('T')[0],
        payment_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        attachment: null
    });

    const [preview, setPreview] = useState(null);

    // AUTO-FILL ÚLTIMA FACTURA PENDIENTE
    useEffect(() => {
        if (!invoiceIdParam && user?.usuario) {
            const fetchPendingInvoice = async () => {
                try {
                    // Buscar facturas del usuario actual
                    const res = await api.get(`/facturas/?cliente=${user.usuario}&limit=10`);
                    const items = Array.isArray(res.data?.results) ? res.data.results : (Array.isArray(res.data) ? res.data : []);

                    // Filtrar solo las pendientes
                    const pendientes = items.filter(inv => inv.estado === 'pendiente' || inv.estado === 'por_pagar');

                    if (pendientes.length > 0) {
                        // Tomar la más reciente
                        pendientes.sort((a, b) => (b.id_factura || b.id || 0) - (a.id_factura || a.id || 0));
                        const latest = pendientes[0];

                        setFormData(prev => ({
                            ...prev,
                            invoice_id: (latest.id_factura || latest.folio || latest.id).toString(),
                            amount: (latest.total || '').toString()
                        }));
                        toast.success(`Factura #${latest.id_factura || latest.folio} auto-cargada`, { id: 'auto-load-inv' });
                    }
                } catch (error) {
                    console.error("No se pudo auto-cargar factura", error);
                }
            };
            fetchPendingInvoice();
        }
    }, [invoiceIdParam, user]);

    const paymentMethods = [
        { id: '16749', name: 'Transferencia Bancaria' },
        { id: '16748', name: 'Efectivo' }
    ];

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('La imagen no debe superar los 10MB');
                return;
            }
            setFormData({ ...formData, attachment: file });
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.attachment) {
            toast.error('Debe adjuntar el comprobante de pago obligatoriamente');
            return;
        }

        if (!formData.invoice_id) {
            toast.error('Número de factura es requerido para el reporte oficial');
            return;
        }

        // VALIDACIÓN DE REFERENCIA (Exclusivamente 6 números)
        const refLimpia = formData.reference.trim();
        if (!refLimpia) {
            toast.error('La referencia de pago es obligatoria');
            return;
        }
        if (!/^\d{6}$/.test(refLimpia)) {
            toast.error('La referencia debe contener exactamente 6 números');
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append('user_name', formData.user_name);
            data.append('phone', formData.phone);
            data.append('invoice_id', formData.invoice_id);
            data.append('amount', formData.amount);
            data.append('reference', refLimpia);
            data.append('forma_pago', formData.forma_pago);
            // CORRECCIÓN: Wisphub exige YYYY-MM-DD. No concatenar la hora.
            data.append('payment_date', formData.payment_date);
            data.append('comprobante_pago_archivo', formData.attachment);
            // Pass id_servicio for WispHub tracking
            if (user?.id_servicio) data.append('id_servicio', user.id_servicio);

            const response = await fetch('/proxy_payments.php', {
                method: 'POST',
                body: data,
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                setSuccess(true);
                setWisphubSuccess(result.wisphub === true);
                toast.success(result.wisphub ? '¡Pago registrado en WispHub!' : 'Reporte recibido por administración');
            } else {
                const apiError = result.errors?.[0] || result.messages?.[0] || result.message || 'Error en el servidor de Wisphub';
                throw new Error(apiError);
            }
        } catch (error) {
            console.error('Submit Error:', error);
            toast.error(error.message || 'No se pudo procesar el reporte.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto p-8 text-center glass-panel border-green-500/30 rounded-3xl"
            >
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
                    <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 font-display text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                    {wisphubSuccess ? '¡PAGO REGISTRADO!' : '¡REPORTE RECIBIDO!'}
                </h2>
                <p className="text-cyan-200/70 mb-8 max-w-md mx-auto">
                    {wisphubSuccess
                        ? 'Tu pago ha sido registrado automáticamente en el sistema. Será verificado por administración.'
                        : 'Tu reporte fue enviado a administración por correo electrónico. Recibirás confirmación cuando el pago sea validado.'
                    }
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={() => navigate('/client')}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-xl font-bold transition-all"
                    >
                        VOLVER AL MENÚ
                    </button>
                    <button
                        onClick={() => navigate('/client/payment-story', { state: formData })}
                        className="flex-1 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
                    >
                        <Share2 size={20} /> COMPARTIR EN HISTORIAS
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/client')}
                    className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white font-display tracking-tight uppercase">Reportar Pago</h1>
                    <p className="text-cyan-500/50 text-[10px] font-mono tracking-widest uppercase">:: Formulario de Validación de Transacciones ::</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Details */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="glass-panel p-8 space-y-6"
                >
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Nombre de Usuario</label>
                            <div className="relative group">
                                <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30" />
                                <input
                                    type="text"
                                    value={formData.user_name}
                                    readOnly
                                    className="w-full bg-cyan-950/30 glass-input rounded-xl pl-12 pr-4 py-3 text-slate-400 outline-none cursor-not-allowed shadow-inner opacity-70"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">Factura # <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                    <input
                                        type="text"
                                        placeholder="Obligatorio"
                                        required
                                        value={formData.invoice_id}
                                        onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
                                        className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">Monto ($)</label>
                                <div className="relative group">
                                    <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        required
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Forma de Pago</label>
                            <div className="relative group">
                                <Landmark size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                <select
                                    value={formData.forma_pago}
                                    onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-10 py-3 text-white outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                >
                                    {paymentMethods.map(m => (
                                        <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none" />
                            </div>
                        </div>


                        <div className="space-y-2">
                            <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">Referencia de Pago <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                <input
                                    type="text"
                                    placeholder="6 dígitos numéricos"
                                    required
                                    maxLength={6}
                                    value={formData.reference}
                                    onChange={(e) => {
                                        // Solo permite números
                                        const val = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, reference: val });
                                    }}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Fecha</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.payment_date}
                                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Hora</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.payment_time}
                                    onChange={(e) => setFormData({ ...formData, payment_time: e.target.value })}
                                    className="w-full bg-cyan-950/20 glass-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right Side: Upload */}
                <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex flex-col gap-6"
                >
                    <div className="glass-panel p-8 space-y-6 flex-1 border-dashed border-cyan-500/30">
                        <label className="block text-xs font-bold text-cyan-300 uppercase tracking-widest opacity-70 mb-4">Comprobante de Pago <span className="text-red-500">*</span></label>

                        <div className="relative h-full flex flex-col">
                            {!preview ? (
                                <label className="flex-1 min-h-[300px] border-2 border-dashed border-cyan-500/20 hover:border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer bg-cyan-950/10 hover:bg-cyan-950/20 transition-all group overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.05)_0%,transparent_70%)] group-hover:bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.1)_0%,transparent_70%)] transition-all animate-pulse" />
                                    <div className="relative z-10 flex flex-col items-center gap-4">
                                        <div className="p-4 bg-cyan-500/10 rounded-full group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,243,255,0.1)]">
                                            <Upload className="w-8 h-8 text-cyan-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold uppercase text-[10px] tracking-widest">Haga clic o arrastre comprobante</p>
                                            <p className="text-cyan-500/40 text-[8px] uppercase mt-1 font-mono tracking-tighter">IMAGEN O PDF (OBLIGATORIO)</p>
                                        </div>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="relative flex-1 rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/40 shadow-2xl">
                                    {formData.attachment?.type.includes('pdf') ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                                            <div className="w-16 h-16 bg-red-500/10 rounded-xl flex items-center justify-center">
                                                <Landmark className="w-8 h-8 text-red-400" />
                                            </div>
                                            <p className="text-white text-xs font-bold">{formData.attachment.name}</p>
                                        </div>
                                    ) : (
                                        <img src={preview} alt="Vista previa" className="w-full h-full object-contain" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-6">
                                        <button
                                            type="button"
                                            onClick={() => { setPreview(null); setFormData({ ...formData, attachment: null }); }}
                                            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold uppercase transition-all tracking-widest"
                                        >
                                            Remover y Cambiar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-6 font-display text-sm font-bold tracking-[0.3em] bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,100,200,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative z-10 flex items-center justify-center gap-3">
                            {loading ? (
                                <>SINCRONIZANDO <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> </>
                            ) : (
                                <>VALIDAR PAGO <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> </>
                            )}
                        </span>
                    </button>
                    <p className="text-center text-[8px] text-cyan-500/30 font-mono tracking-widest uppercase">Seguridad SSL Activa :: Conexión Encriptada con Wisphub</p>
                </motion.div>
            </form>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-5 bg-cyan-950/40 border border-cyan-500/10 rounded-2xl shadow-inner"
            >
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <AlertCircle className="text-cyan-400 shrink-0" size={20} />
                </div>
                <p className="text-[10px] text-cyan-200/50 uppercase tracking-[0.1em] font-mono leading-relaxed max-w-2xl">
                    <span className="text-cyan-400 font-bold">AVISO:</span> EL REPORTE SERÁ VERIFICADO MANUALMENTE POR ADMINISTRACIÓN. POR FAVOR, ASEGÚRESE DE QUE EL COMPROBANTE SEA LEGIBLE PARA EVITAR RETRASOS EN EL PROCESO.
                </p>
            </motion.div>
        </div>
    );
};

export default PaymentReport;
