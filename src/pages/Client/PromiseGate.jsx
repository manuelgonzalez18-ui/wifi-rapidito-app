import { useEffect, useState } from 'react';
import { CalendarX2, CreditCard, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../../auth/authStore';
import api from '../../api/client';
import { LoadingBlock, PageHeading, Surface } from '../../components/ui/ClientUi';

const formatDate = (value) => {
    if (!value) return 'la fecha indicada';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' }).format(date);
};

const PromiseGate = ({ children }) => {
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(true);
    const [restriction, setRestriction] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const checkRestriction = async () => {
            const serviceId = user?.id_servicio ? String(user.id_servicio) : '';
            const username = user?.usuario || user?.username || '';

            if (!serviceId || !username) {
                if (!cancelled) setLoading(false);
                return;
            }

            try {
                const response = await api.get('/promise_restrictions.php', {
                    params: { action: 'check', service_id: serviceId, username },
                    timeout: 8000,
                });
                if (!cancelled) {
                    setRestriction(response?.data?.blocked ? response.data : null);
                }
            } catch (error) {
                console.warn('Promise restriction pre-check unavailable:', error?.message || error);
                // El backend vuelve a comprobar la restricción antes de registrar
                // la promesa. Un fallo de esta consulta visual no permite saltarse
                // la regla de negocio.
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        checkRestriction();
        return () => { cancelled = true; };
    }, [user?.id_servicio, user?.usuario, user?.username]);

    if (loading) {
        return <LoadingBlock label="Verificando disponibilidad de promesa…" />;
    }

    if (!restriction?.blocked) return children;

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-4">
            <PageHeading
                eyebrow="Gestiones"
                title="Promesa de pago temporalmente no disponible"
                description="Esta restricción aplica únicamente al beneficio de solicitar una nueva promesa de pago."
            />

            <Surface className="border-red-400/20 bg-red-400/[0.045] p-6 sm:p-8">
                <div className="flex flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
                        <ShieldAlert size={30} />
                    </span>
                    <h2 className="mt-5 text-xl font-semibold text-white">Beneficio suspendido por incumplimiento</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                        Registramos el incumplimiento de una promesa de pago anterior. De acuerdo con la política de Wifi Rapidito,
                        podrás solicitar nuevamente este beneficio a partir del{' '}
                        <strong className="text-slate-200">{formatDate(restriction.blocked_until)}</strong>.
                    </p>

                    <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-slate-300">
                        <CalendarX2 size={17} className="text-red-300" />
                        La suspensión vence automáticamente; no afecta pagos, facturas ni soporte técnico.
                    </div>

                    <Link to="/client/payments" className="primary-action mt-6">
                        <CreditCard size={17} /> Reportar un pago
                    </Link>
                </div>
            </Surface>
        </div>
    );
};

export default PromiseGate;
