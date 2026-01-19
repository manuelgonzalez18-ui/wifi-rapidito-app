import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MoreVertical, Wifi, WifiOff } from 'lucide-react';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import api from '../../api/client';

const StaffDashboard = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await api.get('/clients');
                setClients(res.data.results);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchClients();
    }, []);

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-bold text-slate-800">Panel de Administración</h1>
                    <p className="text-slate-500 mt-1">Gestión de red y usuarios</p>
                </motion.div>

                <div className="w-full md:w-96">
                    <Input icon={Search} placeholder="Buscar cliente por nombre o IP..." />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {['Clientes Activos', 'Suspendidos', 'Instalaciones Hoy', 'Tickets Abiertos'].map((label, i) => (
                    <Card key={label} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 cursor-pointer">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${i === 1 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <Wifi size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{10 + i * 5}</p>
                            <p className="text-xs text-slate-500 uppercase font-semibold">{label}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="overflow-hidden p-0">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-lg text-slate-800">Clientes Recientes</h3>
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">Ver todos</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4">Plan</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Cargando clientes...</td></tr>
                            ) : clients.map((client) => (
                                <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-700">{client.name}</td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-sm">{client.ip}</td>
                                    <td className="px-6 py-4 text-slate-600">{client.plan}</td>
                                    <td className="px-6 py-4">
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5",
                                            client.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                        )}>
                                            {client.status === 'active' ? <Wifi size={12} /> : <WifiOff size={12} />}
                                            {client.status === 'active' ? 'Activo' : 'Suspendido'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

// Utils import fix if needed (assuming cn is in ../../utils which it is)
import { cn } from '../../utils';

export default StaffDashboard;
