import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    ArrowLeftRight,
    Building2,
    Check,
    CheckCircle,
    ChevronDown,
    ClipboardPaste,
    Copy,
    CreditCard,
    DollarSign,
    Hash,
    Landmark,
    Phone,
    Send,
    Share2,
    Smartphone,
    Upload,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../../auth/authStore';
import api from '../../api/client';

const SERVICE_PRICE_USD = 25;
const BANESCO_RECEIVER = {
    bank: 'BANESCO',
    rif: 'J-402638850',
    account: '01340332563321061868',
    phone: '04120330315',
};

const PAYMENT_METHOD_ID = '16749';
const PAYMENT_TYPE_TO_WISPHUB = {
    pm_banesco: PAYMENT_METHOD_ID,
    pm_interbancario: PAYMENT_METHOD_ID,
    tf_banesco: PAYMENT_METHOD_ID,
    tf_interbancario: PAYMENT_METHOD_ID,
};

const PAYMENT_TYPES = [
    {
        id: 'pm_banesco',
        label: 'Pago Móvil de Banesco a Banesco',
        shortLabel: 'P. Móvil Banesco',
        icon: Smartphone,
        color: 'from-green-500 to-emerald-600',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-400',
        description: 'Pago móvil entre cuentas Banesco',
        needsBankSelector: false,
        needsPhoneEmitter: true,
        refLength: { min: 6, max: 6 },
        refHintText: 'Ingrese SOLO los últimos 6 dígitos',
    },
    {
        id: 'pm_interbancario',
        label: 'Pago Móvil de Otros Bancos a Banesco',
        shortLabel: 'P. Móvil Otros Bancos',
        icon: ArrowLeftRight,
        color: 'from-blue-500 to-cyan-600',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        textColor: 'text-blue-400',
        description: 'Pago móvil realizado desde otro banco hacia Banesco',
        needsBankSelector: true,
        needsPhoneEmitter: true,
        refLength: { min: 6, max: 6 },
        refHintText: 'Ingrese SOLO los últimos 6 dígitos',
    },
    {
        id: 'tf_banesco',
        label: 'Transferencia de Banesco a Banesco',
        shortLabel: 'Transf. Banesco',
        icon: Building2,
        color: 'from-purple-500 to-violet-600',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/30',
        textColor: 'text-purple-400',
        description: 'Transferencia entre cuentas Banesco',
        needsBankSelector: false,
        needsPhoneEmitter: false,
        refLength: { min: 12, max: 12 },
        refHintText: 'Ingrese los 12 dígitos de la referencia',
    },
    {
        id: 'tf_interbancario',
        label: 'Transferencia de Otros Bancos a Banesco',
        shortLabel: 'Transf. Otros Bancos',
        icon: Landmark,
        color: 'from-amber-500 to-orange-600',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        textColor: 'text-amber-400',
        description: 'Transferencia realizada desde otro banco hacia Banesco',
        needsBankSelector: true,
        needsPhoneEmitter: false,
        refLength: { min: 6, max: 6 },
        refHintText: 'Ingrese SOLO los últimos 6 dígitos',
    },
];

const BANKS = [
    { code: '0102', name: 'Banco de Venezuela' },
    { code: '0104', name: 'Venezolano de Crédito' },
    { code: '0105', name: 'Banco Mercantil' },
    { code: '0108', name: 'Banco Provincial (BBVA)' },
    { code: '0114', name: 'Bancaribe' },
    { code: '0115', name: 'Banco Exterior' },
    { code: '0116', name: 'Banco Occidental de Descuento (BOD)' },
    { code: '0128', name: 'Banco Caroní' },
    { code: '0134', name: 'Banesco' },
    { code: '0137', name: 'Banco Sofitasa' },
    { code: '0138', name: 'Banco Plaza' },
    { code: '0146', name: 'Bangente' },
    { code: '0151', name: 'BFC Banco Fondo Común' },
    { code: '0156', name: '100% Banco' },
    { code: '0157', name: 'Banco DelSur' },
    { code: '0163', name: 'Banco del Tesoro' },
    { code: '0166', name: 'Banco Agrícola de Venezuela' },
    { code: '0168', name: 'Bancrecer' },
    { code: '0169', name: 'Mi Banco' },
    { code: '0171', name: 'Banco Activo' },
    { code: '0172', name: 'Bancamiga' },
    { code: '0174', name: 'Banplus' },
    { code: '0175', name: 'Banco Bicentenario' },
    { code: '0176', name: 'Banco Espirito Santo' },
    { code: '0177', name: 'Banfanb' },
    { code: '0178', name: 'Banco Nacional de Crédito (BNC)' },
    { code: '0191', name: 'Banco Nacional de Crédito (BNC)' },
];

const writeClipboard = async (value) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value));
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = String(value);
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

const readClipboard = async () => {
    if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard API unavailable');
    }
    return navigator.clipboard.readText();
};

const ReceiverRow = ({ icon: Icon, label, value, field, copied, onCopy }) => (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-cyan-500/30 transition-all">
        <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-cyan-500/10 rounded-lg shrink-0">
                <Icon className="text-cyan-400" size={16} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-cyan-200/50 uppercase font-bold tracking-tighter">{label}</p>
                <p className="text-sm text-white font-mono font-bold tracking-tight break-all">{value}</p>
            </div>
        </div>
        <button
            type="button"
            onClick={() => onCopy(value, field)}
            className="p-2 text-white/30 hover:text-cyan-400 transition-colors shrink-0"
            aria-label={`Copiar ${label}`}
        >
            {copied === field ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
    </div>
);

const ReceiverDetails = ({ bcvRate }) => {
    const [copied, setCopied] = useState('');
    const amount = bcvRate ? (bcvRate * SERVICE_PRICE_USD).toFixed(2) : null;

    const copyOne = async (value, field) => {
        try {
            await writeClipboard(value);
            setCopied(field);
            toast.success('Copiado al portapapeles', { id: `copy-${field}`, duration: 1500 });
            setTimeout(() => setCopied(''), 2000);
        } catch {
            toast.error('No se pudo copiar');
        }
    };

    const copyAll = async () => {
        const text = [
            `Banco: ${BANESCO_RECEIVER.bank}`,
            `RIF: ${BANESCO_RECEIVER.rif}`,
            `Cuenta: ${BANESCO_RECEIVER.account}`,
            `Teléfono: ${BANESCO_RECEIVER.phone}`,
            amount ? `Monto: ${amount} Bs` : '',
        ].filter(Boolean).join('\n');

        try {
            await writeClipboard(text);
            setCopied('all');
            toast.success('Todos los datos copiados', { id: 'copy-all', duration: 2000 });
            setTimeout(() => setCopied(''), 2000);
        } catch {
            toast.error('No se pudo copiar');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-6 glass-panel border-cyan-500/20 bg-gradient-to-br from-cyan-950/40 to-slate-950/40"
        >
            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-cyan-500/20 rounded-2xl shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                    <Landmark size={24} className="text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase">Datos de Recepción</h3>
                    <p className="text-xs text-cyan-500 font-mono tracking-widest uppercase opacity-60 font-bold">Banco Banesco :: Wifi Rapidito</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ReceiverRow icon={Landmark} label="Banco Receptor" value={BANESCO_RECEIVER.bank} field="bank" copied={copied} onCopy={copyOne} />
                <ReceiverRow icon={Hash} label="RIF / Cédula" value={BANESCO_RECEIVER.rif} field="rif" copied={copied} onCopy={copyOne} />
                <ReceiverRow icon={CreditCard} label="Número de Cuenta" value={BANESCO_RECEIVER.account} field="acc" copied={copied} onCopy={copyOne} />
                <ReceiverRow icon={Smartphone} label="Teléfono Pago Móvil" value={BANESCO_RECEIVER.phone} field="phone" copied={copied} onCopy={copyOne} />
                {amount && <ReceiverRow icon={DollarSign} label="Monto a Pagar" value={`${amount} Bs`} field="amount" copied={copied} onCopy={copyOne} />}
            </div>

            <button
                type="button"
                onClick={copyAll}
                className="mt-5 w-full py-3.5 flex items-center justify-center gap-2.5 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 hover:from-cyan-800/50 hover:to-blue-800/50 border border-cyan-500/20 hover:border-cyan-400/40 rounded-xl transition-all group"
            >
                {copied === 'all' ? (
                    <>
                        <Check size={18} className="text-green-400" />
                        <span className="text-xs font-bold text-green-400 uppercase tracking-widest">¡COPIADO!</span>
                    </>
                ) : (
                    <>
                        <Copy size={18} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-bold text-cyan-300 uppercase tracking-widest">Copiar todos los datos</span>
                    </>
                )}
            </button>

            <div className="mt-5 flex items-center gap-3 p-3 bg-cyan-400/5 border border-cyan-400/20 rounded-xl">
                <AlertCircle size={18} className="text-cyan-400 shrink-0" />
                <p className="text-[10px] text-cyan-100/70 font-medium italic leading-relaxed">
                    Asegúrese de copiar los datos exactamente como aparecen. Los pagos se validan preventivamente contra la red interbancaria.
                </p>
            </div>
        </motion.div>
    );
};

const PaymentReport = () => {
    const [searchParams] = useSearchParams();
    const invoiceIdParam = searchParams.get('invoice');
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [wisphubSuccess, setWisphubSuccess] = useState(false);
    const [bcvRate, setBcvRate] = useState(null);
    const [bcvLoading, setBcvLoading] = useState(true);
    const [paymentType, setPaymentType] = useState(null);
    const [pasteAmountDone, setPasteAmountDone] = useState(false);
    const [preview, setPreview] = useState(null);

    const [formData, setFormData] = useState({
        user_name: user?.usuario || user?.usuario_portal || user?.name || '',
        phone: user?.telefono || '',
        invoice_id: invoiceIdParam || '',
        amount: '0.00',
        reference: '',
        forma_pago: PAYMENT_METHOD_ID,
        payment_date: new Date().toISOString().split('T')[0],
        payment_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        attachment: null,
        banco_origen: '',
        phone_emisor: '',
    });

    const selectedType = useMemo(
        () => PAYMENT_TYPES.find((item) => item.id === paymentType) || null,
        [paymentType],
    );

    useEffect(() => {
        const fetchBcvRate = async () => {
            try {
                setBcvLoading(true);
                const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
                if (!response.ok) throw new Error('No se pudo consultar la tasa BCV');
                const data = await response.json();
                const rate = Number(data.promedio || data.venta || data.compra);
                if (!Number.isFinite(rate) || rate <= 0) throw new Error('Tasa BCV inválida');

                setBcvRate(rate);
                setFormData((current) => ({
                    ...current,
                    amount: current.amount === '0.00' ? (rate * SERVICE_PRICE_USD).toFixed(2) : current.amount,
                }));
                toast.success(`Tasa BCV: ${rate.toFixed(2)} Bs/$`, { id: 'bcv-rate' });
            } catch (error) {
                console.error('Error fetching BCV rate:', error);
                toast.error('No se pudo obtener la tasa BCV');
            } finally {
                setBcvLoading(false);
            }
        };

        fetchBcvRate();
    }, []);

    useEffect(() => {
        if (invoiceIdParam || !user || (!user.usuario && !user.cedula)) return;

        const fetchPendingInvoice = async () => {
            try {
                const strippedUser = user.usuario ? String(user.usuario).split('@')[0] : '';
                const invoiceQueries = [
                    user.usuario ? api.get(`/facturas/?cliente=${user.usuario}&limit=10`) : null,
                    strippedUser ? api.get(`/facturas/?cliente=${strippedUser}&limit=10`) : null,
                    user.cedula ? api.get(`/facturas/?search=${user.cedula}&limit=10`) : null,
                    user.id_servicio ? api.get(`/facturas/?id_servicio=${user.id_servicio}&limit=10`) : null,
                    user.id_cliente ? api.get(`/facturas/?id_cliente=${user.id_cliente}&limit=10`) : null,
                ].filter(Boolean);

                const responses = await Promise.allSettled(invoiceQueries);
                const allResults = [];
                responses.forEach((response) => {
                    if (response.status !== 'fulfilled') return;
                    const data = response.value.data;
                    const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
                    allResults.push(...items);
                });

                const unique = new Map();
                allResults.forEach((invoice) => {
                    const id = invoice.id_factura || invoice.id || invoice.folio;
                    if (id) unique.set(id, invoice);
                });

                const pending = Array.from(unique.values()).filter((invoice) => {
                    const state = String(invoice.estado || '').toLowerCase().trim();
                    return state.includes('pendiente') || state.includes('por_pagar') || state.includes('unpaid') || invoice.estado === 2;
                });

                if (!pending.length) return;
                pending.sort((a, b) => (b.id_factura || b.id || 0) - (a.id_factura || a.id || 0));
                const latest = pending[0];
                setFormData((current) => ({
                    ...current,
                    invoice_id: String(latest.id_factura || latest.folio || latest.id),
                }));
                toast.success(`Factura #${latest.id_factura || latest.folio} auto-cargada`, { id: 'auto-load-inv' });
            } catch (error) {
                console.error('No se pudo auto-cargar factura', error);
            }
        };

        fetchPendingInvoice();
    }, [invoiceIdParam, user]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('La imagen no debe superar los 10MB');
            return;
        }

        setFormData((current) => ({ ...current, attachment: file }));
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const pasteAmount = async () => {
        try {
            const clipboard = await readClipboard();
            let normalized = String(clipboard || '').replace(/[^\d.,]/g, '').replace(',', '.');
            const amount = Number.parseFloat(normalized);
            if (!Number.isFinite(amount)) {
                toast.error('Formato de monto inválido', { id: 'paste-amount-err' });
                return;
            }
            normalized = amount.toFixed(2);
            setFormData((current) => ({ ...current, amount: normalized }));
            setPasteAmountDone(true);
            toast.success('Monto pegado', { id: 'paste-amount' });
            setTimeout(() => setPasteAmountDone(false), 2000);
        } catch {
            toast.error('No se pudo acceder al portapapeles', { id: 'paste-err' });
        }
    };

    const pasteReference = async () => {
        if (!selectedType) return;
        try {
            const clipboard = await readClipboard();
            const digits = String(clipboard || '').replace(/\D/g, '');
            const max = selectedType.refLength.max;
            const reference = digits.length > max ? digits.slice(-max) : digits;
            setFormData((current) => ({ ...current, reference }));
            toast.success(`Referencia pegada: ${reference}`, { id: 'paste-ref', duration: 2000 });
        } catch {
            toast.error('No se pudo acceder al portapapeles', { id: 'paste-err' });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!selectedType) {
            toast.error('Debe seleccionar cómo realizó su pago');
            return;
        }
        if (!formData.attachment) {
            toast.error('Debe adjuntar el comprobante de pago obligatoriamente');
            return;
        }
        if (!formData.invoice_id) {
            toast.error('Número de factura es requerido para el reporte oficial');
            return;
        }
        if (Number.parseFloat(formData.amount) <= 0) {
            toast.error('El monto del pago debe ser mayor a cero');
            return;
        }

        const reference = formData.reference.trim();
        if (!reference) {
            toast.error('La referencia de pago es obligatoria');
            return;
        }
        const requiredLength = selectedType.refLength.min;
        if (!new RegExp(`^\\d{${requiredLength}}$`).test(reference)) {
            toast.error(selectedType.refHintText || `La referencia debe contener exactamente ${requiredLength} dígitos numéricos`);
            return;
        }
        if (selectedType.needsBankSelector && !formData.banco_origen) {
            toast.error('Debe seleccionar el banco desde donde realizó el pago');
            return;
        }
        if (selectedType.needsPhoneEmitter) {
            const phone = formData.phone_emisor.replace(/\D/g, '');
            if (!phone || phone.length < 10 || phone.length > 12) {
                toast.error('Ingrese el número de teléfono emisor válido (ej: 04121234567)');
                return;
            }
        }

        let amountMismatch = false;
        if (bcvRate) {
            const expectedAmount = bcvRate * SERVICE_PRICE_USD;
            const reportedAmount = Number.parseFloat(formData.amount);
            const tolerance = expectedAmount * 0.01;
            amountMismatch = Math.abs(reportedAmount - expectedAmount) > tolerance;
        }

        setLoading(true);
        try {
            const data = new FormData();
            data.append('user_name', formData.user_name);
            data.append('phone', formData.phone);
            data.append('invoice_id', formData.invoice_id);
            data.append('amount', formData.amount);
            data.append('reference', reference);
            data.append('forma_pago', PAYMENT_TYPE_TO_WISPHUB[paymentType] || PAYMENT_METHOD_ID);
            data.append('payment_date', formData.payment_date);
            data.append('comprobante_pago_archivo', formData.attachment);
            if (amountMismatch) data.append('ignore_banesco_auto', '1');
            data.append('payment_type', paymentType);
            data.append('payment_type_label', selectedType.label);

            if (formData.banco_origen) {
                const bank = BANKS.find((item) => item.code === formData.banco_origen);
                data.append('banco_origen', formData.banco_origen);
                data.append('banco_origen_nombre', bank?.name || '');
            }
            if (formData.phone_emisor) data.append('phone_emisor', formData.phone_emisor);
            if (user?.id_servicio) data.append('id_servicio', user.id_servicio);

            const response = await fetch('https://wifirapidito.com/proxy_payments.php', {
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
                    {wisphubSuccess ? '¡VALIDADO Y ACTIVADO!' : '¡REPORTE RECIBIDO!'}
                </h2>
                <p className="text-cyan-200/70 mb-8 max-w-md mx-auto">
                    {wisphubSuccess
                        ? '¡Tu transacción en Banesco fue validada con éxito, WispHub confirmó la factura y tu servicio de internet fue activado automáticamente!'
                        : 'Tu reporte ha sido registrado en WispHub para revisión manual. Recibirás una notificación cuando administración lo valide.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/client')}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-xl font-bold transition-all"
                    >
                        VOLVER AL MENÚ
                    </button>
                    <button
                        type="button"
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
            <div className="flex items-center gap-4">
                <button
                    type="button"
                    onClick={() => navigate('/client')}
                    className="p-3 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/10"
                    aria-label="Volver al inicio"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white font-display tracking-tight uppercase">Reportar Pago</h1>
                    <p className="text-cyan-500/50 text-[10px] font-mono tracking-widest uppercase">:: Formulario de Validación de Transacciones ::</p>
                </div>
            </div>

            <ReceiverDetails bcvRate={bcvRate} />

            {bcvLoading && (
                <div className="glass-panel p-4 border-cyan-500/20 flex items-center gap-3 text-cyan-200/70 text-xs">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/20 border-t-cyan-400" />
                    Consultando tasa oficial BCV para calcular US${SERVICE_PRICE_USD} en bolívares...
                </div>
            )}

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-6 lg:p-8 space-y-5"
            >
                <div className="space-y-2">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest font-display flex items-center gap-2">
                        <CreditCard size={16} className="text-cyan-400" /> ¿Cómo realizó su pago?
                    </h3>
                    <p className="text-[10px] text-cyan-500/50 font-mono tracking-wider uppercase">Seleccione la modalidad de pago utilizada</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PAYMENT_TYPES.map((type) => {
                        const Icon = type.icon;
                        const selected = paymentType === type.id;
                        return (
                            <motion.button
                                key={type.id}
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPaymentType(type.id)}
                                className={`relative p-4 rounded-2xl border-2 transition-all duration-300 text-left group overflow-hidden ${
                                    selected
                                        ? `${type.borderColor} ${type.bgColor} shadow-lg`
                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                }`}
                            >
                                {selected && (
                                    <motion.div
                                        layoutId="paymentTypeGlow"
                                        className={`absolute inset-0 opacity-20 bg-gradient-to-br ${type.color}`}
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <div className="relative z-10 flex items-start gap-3">
                                    <div className={`p-2.5 rounded-xl transition-colors ${selected ? type.bgColor : 'bg-white/5 group-hover:bg-white/10'}`}>
                                        <Icon size={20} className={`transition-colors ${selected ? type.textColor : 'text-slate-400 group-hover:text-white'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold uppercase tracking-wide transition-colors ${selected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                            {type.label}
                                        </p>
                                        <p className={`text-[9px] mt-1 font-mono tracking-wider transition-colors ${selected ? `${type.textColor} opacity-80` : 'text-slate-500'}`}>
                                            {type.description}
                                        </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 mt-0.5 ${selected ? `${type.borderColor} ${type.bgColor}` : 'border-white/20'}`}>
                                        {selected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${type.color}`} />}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {selectedType && (
                        <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[9px] text-center text-cyan-500/40 font-mono tracking-widest uppercase"
                        >
                            ✓ {selectedType.label} seleccionado — puede cambiar en cualquier momento
                        </motion.p>
                    )}
                </AnimatePresence>
            </motion.div>

            <AnimatePresence>
                {selectedType && (
                    <motion.form
                        key={selectedType.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.35, delay: 0.1 }}
                        onSubmit={handleSubmit}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="glass-panel p-6 sm:p-8 space-y-6"
                        >
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${selectedType.bgColor} ${selectedType.borderColor} border`}>
                                <selectedType.icon size={14} className={selectedType.textColor} />
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedType.textColor}`}>{selectedType.label}</span>
                            </div>

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

                                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">Factura # <span className="text-red-500">*</span></label>
                                        <div className="relative group">
                                            <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                            <input
                                                type="text"
                                                placeholder="Obligatorio"
                                                required
                                                value={formData.invoice_id}
                                                onChange={(event) => setFormData((current) => ({ ...current, invoice_id: event.target.value }))}
                                                className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 sm:col-span-3">
                                        <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">
                                            Monto (Bs) <span className="text-red-500">*</span> <span className="text-cyan-400/70">• Colocar monto exacto incluyendo decimales</span>
                                        </label>
                                        <div className="relative group">
                                            <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={(event) => {
                                                    const digits = event.target.value.replace(/\D/g, '');
                                                    const amount = digits ? (Number.parseInt(digits, 10) / 100).toFixed(2) : '0.00';
                                                    setFormData((current) => ({ ...current, amount }));
                                                }}
                                                className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-20 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono text-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={pasteAmount}
                                                title="Pegar monto"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg transition-all flex items-center gap-1.5"
                                            >
                                                {pasteAmountDone ? <Check size={14} className="text-cyan-400" /> : <><ClipboardPaste size={14} className="text-cyan-400" /><span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Pegar</span></>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={selectedType.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-4"
                                    >
                                        {selectedType.needsBankSelector && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-80 flex items-center gap-2">
                                                    <Landmark size={12} /> Banco Origen <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <Landmark size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                                    <select
                                                        value={formData.banco_origen}
                                                        onChange={(event) => setFormData((current) => ({ ...current, banco_origen: event.target.value }))}
                                                        required
                                                        className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-10 py-3 text-white outline-none focus:border-cyan-500/50 transition-all appearance-none"
                                                    >
                                                        <option value="" className="bg-slate-900">-- Seleccione su banco --</option>
                                                        {BANKS.map((bank) => <option key={bank.code} value={bank.code} className="bg-slate-900">{bank.code} - {bank.name}</option>)}
                                                    </select>
                                                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500/50 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        {selectedType.needsPhoneEmitter && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-80 flex items-center gap-2">
                                                    <Phone size={12} /> Teléfono Emisor <span className="text-red-500">*</span>
                                                </label>
                                                <div className="relative group">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                                    <input
                                                        type="tel"
                                                        placeholder="Ej: 04121234567"
                                                        required
                                                        maxLength={12}
                                                        value={formData.phone_emisor}
                                                        onChange={(event) => setFormData((current) => ({ ...current, phone_emisor: event.target.value.replace(/\D/g, '') }))}
                                                        className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70 font-mono">
                                        Referencia de Pago <span className="text-red-500">*</span>
                                        <span className="text-cyan-500/80 normal-case block ml-1 mt-1 text-[10px] tracking-normal font-sans">({selectedType.refHintText})</span>
                                    </label>
                                    <div className="relative group">
                                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/30 group-focus-within:text-cyan-400" />
                                        <input
                                            type="text"
                                            placeholder={selectedType.refHintText}
                                            required
                                            maxLength={selectedType.refLength.max}
                                            value={formData.reference}
                                            onChange={(event) => setFormData((current) => ({ ...current, reference: event.target.value.replace(/\D/g, '') }))}
                                            className="w-full bg-cyan-950/20 glass-input rounded-xl pl-12 pr-20 py-3 text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={pasteReference}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            <ClipboardPaste size={14} className="text-cyan-400" />
                                            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Pegar</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Fecha</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.payment_date}
                                            onChange={(event) => setFormData((current) => ({ ...current, payment_date: event.target.value }))}
                                            className="w-full bg-cyan-950/20 glass-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-cyan-300 uppercase tracking-widest ml-1 opacity-70">Hora</label>
                                        <input
                                            type="time"
                                            required
                                            value={formData.payment_time}
                                            onChange={(event) => setFormData((current) => ({ ...current, payment_time: event.target.value }))}
                                            className="w-full bg-cyan-950/20 glass-input rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col gap-6"
                        >
                            <div className="glass-panel p-6 sm:p-8 space-y-6 flex-1 border-dashed border-cyan-500/30">
                                <label className="block text-xs font-bold text-cyan-300 uppercase tracking-widest opacity-70 mb-4">Comprobante de Pago <span className="text-red-500">*</span></label>
                                <div className="relative h-full flex flex-col">
                                    {preview ? (
                                        <div className="relative flex-1 min-h-[300px] rounded-2xl overflow-hidden border border-cyan-500/30 bg-black/40 shadow-2xl">
                                            {formData.attachment?.type.includes('pdf') ? (
                                                <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-4 bg-slate-900/50">
                                                    <div className="w-16 h-16 bg-red-500/10 rounded-xl flex items-center justify-center">
                                                        <Landmark className="w-8 h-8 text-red-400" />
                                                    </div>
                                                    <p className="text-white text-xs font-bold px-4 text-center break-all">{formData.attachment.name}</p>
                                                </div>
                                            ) : (
                                                <img src={preview} alt="Vista previa" className="w-full h-full min-h-[300px] object-contain" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex items-end p-6">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPreview(null);
                                                        setFormData((current) => ({ ...current, attachment: null }));
                                                    }}
                                                    className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-bold uppercase transition-all tracking-widest"
                                                >
                                                    Remover y Cambiar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="relative flex-1 min-h-[300px] border-2 border-dashed border-cyan-500/20 hover:border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer bg-cyan-950/10 hover:bg-cyan-950/20 transition-all group overflow-hidden">
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
                                        <>SINCRONIZANDO <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /></>
                                    ) : (
                                        <>VALIDAR PAGO <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                                    )}
                                </span>
                            </button>
                            <p className="text-center text-[8px] text-cyan-500/30 font-mono tracking-widest uppercase">Seguridad SSL Activa :: Conexión Encriptada con Wisphub</p>
                            <p className="text-xs text-gray-500 mt-4 text-center opacity-50 font-mono tracking-widest">V6.0.0-PRO-MASTER</p>
                        </motion.div>
                    </motion.form>
                )}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 p-5 bg-cyan-950/40 border border-cyan-500/10 rounded-2xl shadow-inner mt-8"
            >
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <AlertCircle className="text-cyan-400 shrink-0" size={20} />
                </div>
                <p className="text-[10px] text-cyan-200/50 uppercase tracking-[0.1em] font-mono leading-relaxed max-w-2xl">
                    <span className="text-cyan-400 font-bold">AVISO:</span> EL REPORTE SERÁ VERIFICADO MANUALMENTE POR ADMINISTRACIÓN SI LA VALIDACIÓN AUTOMÁTICA NO TIENE ÉXITO.
                </p>
            </motion.div>
        </div>
    );
};

export default PaymentReport;
