import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Printer, Mail, Phone,
    Globe, MapPin, CheckCircle, Clock, AlertCircle,
    ShieldCheck, CreditCard, Receipt, HelpCircle, Wifi
} from 'lucide-react';
import api from '../../api/client';
import useAuthStore from '../../auth/authStore';

const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const response = await api.get(`/facturas/${id}/`);
                let data = response.data;

                // Handle proxy results
                if (data.results && Array.isArray(data.results)) {
                    data = data.results.find(inv =>
                        String(inv.id_factura) === String(id) ||
                        String(inv.folio) === String(id) ||
                        String(inv.id) === String(id)
                    ) || data.results[0];
                }

                if (data && (data.id_factura || data.id)) {
                    setInvoice(data);
                } else {
                    throw new Error("Empty data");
                }
            } catch (err) {
                console.error("Error fetching invoice detail:", err);
                setError("No pudimos encontrar los detalles de esta factura. Asegúrate de que el ID sea correcto.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchInvoice();
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const getStatusInfo = (status) => {
        const s = String(status || '').toLowerCase();
        if (s.includes('pagada')) return { label: 'Pagada', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle };
        if (s.includes('pendiente') || s.includes('por_pagar')) return { label: 'Pendiente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: Clock };
        if (s.includes('vencida')) return { label: 'Vencida', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle };
        return { label: status || 'Desconocido', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', icon: HelpCircle };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-cyan-500 font-display text-sm tracking-widest animate-pulse">CARGANDO RECUERDO DIGITAL...</p>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="glass-panel p-10 rounded-2xl text-center max-w-2xl mx-auto mt-20">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-2">Ups! Algo salió mal</h2>
                <p className="text-slate-400 mb-8">{error || "No se encontró el comprobante."}</p>
                <button
                    onClick={() => navigate('/client/invoices')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2 mx-auto"
                >
                    <ArrowLeft size={18} />
                    Volver a Facturas
                </button>
            </div>
        );
    }

    const status = getStatusInfo(invoice.estado);
    const StatusIcon = status.icon;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header / Actions - Hidden on Print */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 print:hidden">
                <button
                    onClick={() => navigate('/client/invoices')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold tracking-tight">Volver a mis facturas</span>
                </button>

                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm"
                    >
                        <Printer size={18} />
                        Imprimir
                    </button>
                    {(invoice.estado === 'pendiente' || invoice.estado === 'por_pagar') && (
                        <button
                            onClick={() => navigate(`/client/payments?invoice=${invoice.id_factura || invoice.id}`)}
                            className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm shadow-lg shadow-green-900/20"
                        >
                            <CreditCard size={18} />
                            Reportar Pago
                        </button>
                    )}
                </div>
            </div>

            {/* Main Invoice Sheet */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl relative"
            >
                {/* Visual Accent Strip */}
                <div className={`h-4 w-full ${invoice.estado === 'pagada' ? 'bg-green-500' : 'bg-amber-500'}`} />

                <div className="p-8 sm:p-12">
                    {/* Invoice Top Section */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                        {/* Company Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-900 p-2.5 rounded-xl">
                                    <Wifi className="text-cyan-400 w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Wifi Rapidito</h1>
                                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Inversiones Tu Super Pc 2013 C.A</p>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-slate-400" />
                                    <span>RIF: J-402638850</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" />
                                    <span>wifirapidito@gmail.com</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    <span>0424-226.8245</span>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Status & Meta */}
                        <div className="text-right flex flex-col items-end">
                            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 font-bold text-xs uppercase tracking-widest ${status.bg} ${status.color} ${status.border}`}>
                                <StatusIcon size={14} />
                                {status.label}
                            </div>
                            <h2 className="text-4xl font-black text-slate-900 mb-1">FACTURA</h2>
                            <p className="text-slate-400 font-mono text-xl">#{invoice.id_factura || invoice.folio || invoice.id}</p>

                            <div className="mt-6 flex flex-col gap-1 items-end text-sm">
                                <span className="text-slate-400 font-medium">Fecha de Emisión</span>
                                <span className="font-bold text-slate-800">{invoice.fecha_emision ? new Date(invoice.fecha_emision).toLocaleDateString() : '-'}</span>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100 mb-12" />

                    {/* Client Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-4">FACTURAR A</span>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">{invoice.cliente?.nombre || invoice.nombre || user.name}</h3>
                                <p className="text-slate-500 flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-slate-300" />
                                    CI/RIF: {invoice.cliente?.cedula || invoice.cedula || user.cedula}
                                </p>
                                <p className="text-slate-500 flex items-center gap-2">
                                    <Receipt size={16} className="text-slate-300" />
                                    Servicio ID: {invoice.id_servicio || user.id_servicio}
                                </p>
                            </div>
                        </div>

                        <div className="md:text-right">
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] block mb-4">DETALLES DE PAGO</span>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400 uppercase font-bold">Vencimiento</p>
                                    <p className="text-lg font-bold text-amber-600">{invoice.fecha_vencimiento ? new Date(invoice.fecha_vencimiento).toLocaleDateString() : '-'}</p>
                                </div>
                                {invoice.fecha_pago && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-slate-400 uppercase font-bold">Fecha de Pago</p>
                                        <p className="text-lg font-bold text-green-600">{new Date(invoice.fecha_pago).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="rounded-2xl border border-slate-100 overflow-hidden mb-12">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción del Servicio</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Cant.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {invoice.articulos && invoice.articulos.length > 0 ? (
                                    invoice.articulos.map((art, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-6">
                                                <p className="font-bold text-slate-800">{art.nombre || 'Servicio de Internet'}</p>
                                                <p className="text-xs text-slate-400 mt-1">Periodo: {invoice.fecha_emision ? new Date(invoice.fecha_emision).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) : '-'}</p>
                                            </td>
                                            <td className="px-6 py-6 text-right font-medium text-slate-600">{art.cantidad || 1}</td>
                                            <td className="px-6 py-6 text-right font-medium text-slate-600">${parseFloat(art.precio || 0).toFixed(2)}</td>
                                            <td className="px-6 py-6 text-right font-bold text-slate-900">${(parseFloat(art.precio || 0) * (art.cantidad || 1)).toFixed(2)}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-6 font-bold text-slate-800">Servicio de Internet - {invoice.fecha_emision ? new Date(invoice.fecha_emision).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase() : '-'}</td>
                                        <td className="px-6 py-6 text-right font-medium text-slate-600">1</td>
                                        <td className="px-6 py-6 text-right font-medium text-slate-600">${parseFloat(invoice.total || 0).toFixed(2)}</td>
                                        <td className="px-6 py-6 text-right font-bold text-slate-900">${parseFloat(invoice.total || 0).toFixed(2)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-12">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 max-w-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Instrucciones</h4>
                            <p className="text-xs text-slate-500 leading-relaxed italic">
                                Para mantener su servicio activo, por favor realice el pago antes de la fecha de vencimiento. Puede reportar su pago a través del botón "Reportar Pago" en su panel de cliente o vía WhatsApp.
                            </p>
                        </div>

                        <div className="w-full md:w-80 space-y-3">
                            <div className="flex justify-between items-center text-slate-500">
                                <span>Subtotal</span>
                                <span className="font-medium font-mono">${(parseFloat(invoice.total || 0) / 1.16).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                                <span>IVA (16%)</span>
                                <span className="font-medium font-mono">${(parseFloat(invoice.total || 0) * 0.138).toFixed(2)}</span>
                            </div>
                            <div className="h-px bg-slate-100 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-xl font-black text-slate-900 uppercase tracking-tighter">Total</span>
                                <span className="text-3xl font-black text-slate-900 font-mono">${parseFloat(invoice.total || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="bg-slate-50 p-6 border-t border-slate-100 flex justify-center text-center">
                    <p className="text-[10px] font-bold text-slate-400 tracking-[0.4em] uppercase">Documento emitido digitalmente por Wifi Rapidito • Gracias por preferirnos</p>
                </div>
            </motion.div>

            {/* Print Only Styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body { background: white !important; padding: 0 !important; }
                    .glass-panel { border: none !important; box-shadow: none !important; }
                    .max-w-4xl { max-width: 100% !important; margin: 0 !important; width: 100% !important; }
                    .print\\:hidden, .whatsapp-button { display: none !important; }
                    .bg-white { box-shadow: none !important; }
                    .rounded-3xl { border-radius: 0 !important; }
                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                }
                @page { margin: 1cm; overflow: visible; }
            `}} />
        </div>
    );
};

export default InvoiceDetail;
