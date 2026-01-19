import { motion } from 'framer-motion';
import { Wifi, ArrowUp, ArrowDown, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import Card from '../../components/ui/Card';
import useAuthStore from '../../auth/authStore';

const StatCard = ({ label, value, icon: Icon, color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white/80 backdrop-blur border border-white/50 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
    >
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-500 text-sm font-medium">{label}</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${color}`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
    </motion.div>
);

const ClientDashboard = () => {
    const { user } = useAuthStore();

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-bold text-slate-800">Hola, {user?.name?.split(' ')[0]} 👋</h1>
                    <p className="text-slate-500 mt-1">Aquí está el resumen de tu servicio</p>
                </motion.div>

                <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Servicio Activo
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Plan Actual"
                    value={user?.plan || 'N/A'}
                    icon={Wifi}
                    color="bg-primary-500"
                    delay={0.1}
                />
                <StatCard
                    label="Saldo Pendiente"
                    value={`$${user?.balance || '0.00'}`}
                    icon={CreditCard}
                    color="bg-secondary-500"
                    delay={0.2}
                />
                <StatCard
                    label="Próximo Pago"
                    value="15 Feb 2026"
                    icon={Calendar}
                    color="bg-slate-800"
                    delay={0.3}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-0 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-white/50">
                        <h3 className="font-bold text-lg text-slate-800">Consumo de Datos</h3>
                    </div>
                    <div className="p-8 flex items-center justify-center min-h-[200px]">
                        {/* Mock Chart Placeholder */}
                        <div className="relative w-full h-32 flex items-end justify-between gap-2 opacity-50">
                            {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${h}%` }}
                                    transition={{ delay: 0.5 + (i * 0.1) }}
                                    className="bg-primary-500 w-full rounded-t-lg"
                                />
                            ))}
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50/50 flex justify-around">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Subida</p>
                            <p className="flex items-center gap-1 text-lg font-bold text-slate-700 mt-1">
                                <ArrowUp className="w-4 h-4 text-primary-500" /> 125 MB
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Bajada</p>
                            <p className="flex items-center gap-1 text-lg font-bold text-slate-700 mt-1">
                                <ArrowDown className="w-4 h-4 text-green-500" /> 8 GB
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="mb-6">
                        <h3 className="font-bold text-lg text-slate-800">Estado de la Red</h3>
                        <p className="text-slate-500 text-sm">Monitoreo en tiempo real</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                            <CheckCircle className="text-green-500 w-5 h-5" />
                            <div className="flex-1">
                                <p className="font-semibold text-slate-800">Conexión Estable</p>
                                <p className="text-sm text-slate-500">Tu router está online y funcionando correctamente.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">IP Asignada</span>
                                <span className="font-mono text-slate-700">192.168.10.45</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Uptime</span>
                                <span className="font-mono text-slate-700">14d 2h 15m</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Latencia</span>
                                <span className="font-mono text-green-600 font-semibold">12ms</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ClientDashboard;
