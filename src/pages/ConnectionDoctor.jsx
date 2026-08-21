import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, CheckCircle2, Gauge, LifeBuoy,
    RadioTower, Router, RotateCcw, WifiOff, Wifi
} from 'lucide-react';
import { PageHeading, StatusPill, Surface } from '../components/ui/ClientUi';

const ISSUES = [
    {
        id: 'offline',
        title: 'No tengo internet',
        ticketSubject: 'No Tiene Internet',
        description: 'No navega ningún dispositivo.',
        icon: WifiOff,
        steps: [
            'Confirma que el router y la ONU estén encendidos y conectados a corriente.',
            'Revisa si la luz LOS está encendida o parpadeando en rojo.',
            'Desconecta la ONU y el router de la corriente durante 30 segundos y vuelve a conectarlos.',
            'Espera de 3 a 5 minutos y prueba nuevamente desde un dispositivo conectado al Wi‑Fi.',
        ],
    },
    {
        id: 'los',
        title: 'La luz LOS está roja',
        ticketSubject: 'Router En Rojo',
        description: 'La ONU muestra una alarma roja.',
        icon: RadioTower,
        steps: [
            'No dobles, halés ni desconectes el cable de fibra óptica.',
            'Verifica visualmente que el cable de fibra no esté cortado o aplastado.',
            'Reinicia únicamente la ONU desconectándola de corriente durante 30 segundos.',
            'Si la luz LOS continúa roja, crea un ticket para que soporte revise la señal.',
        ],
    },
    {
        id: 'slow',
        title: 'Internet lento',
        ticketSubject: 'Internet Lento',
        description: 'Navega, pero con poca velocidad.',
        icon: Gauge,
        steps: [
            'Acércate al router y prueba nuevamente para descartar baja cobertura Wi‑Fi.',
            'Cierra descargas, actualizaciones, TV o streaming en otros dispositivos durante la prueba.',
            'Reinicia el router y espera de 2 a 3 minutos.',
            'Si es posible, prueba por cable de red o desde otro dispositivo antes de crear el ticket.',
        ],
    },
    {
        id: 'wifi',
        title: 'Problema con el Wi‑Fi',
        ticketSubject: 'Otro Asunto',
        description: 'La señal no llega bien a algunas áreas.',
        icon: Wifi,
        steps: [
            'Coloca el router en un lugar abierto, elevado y lo más céntrico posible.',
            'Evita ubicarlo dentro de muebles, detrás del televisor o junto a objetos metálicos.',
            'Prueba cerca del router para confirmar si el problema es únicamente de cobertura.',
            'Si necesitas mejor cobertura en toda la vivienda, solicita asesoría a soporte.',
        ],
    },
];

const ConnectionDoctor = () => {
    const navigate = useNavigate();
    const [issueId, setIssueId] = useState('');
    const [step, setStep] = useState(0);
    const [resolved, setResolved] = useState(false);

    const issue = useMemo(() => ISSUES.find((item) => item.id === issueId), [issueId]);
    const IssueIcon = issue?.icon;

    const chooseIssue = (id) => {
        setIssueId(id);
        setStep(0);
        setResolved(false);
    };

    const reset = () => {
        setIssueId('');
        setStep(0);
        setResolved(false);
    };

    const nextStep = () => {
        if (!issue) return;
        if (step < issue.steps.length - 1) setStep((current) => current + 1);
    };

    const createTicket = () => {
        if (!issue) return;
        navigate('/client/support', {
            state: {
                openTicket: true,
                subject: issue.ticketSubject,
                description: `Realicé el diagnóstico guiado para “${issue.title}” y el problema continúa.`
            }
        });
    };

    return (
        <div className="space-y-6 pb-4">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate('/client/support')}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-slate-400 transition hover:text-white"
                    aria-label="Volver a soporte"
                >
                    <ArrowLeft size={18} />
                </button>
                <PageHeading
                    eyebrow="Diagnóstico guiado"
                    title="Revisemos tu conexión"
                    description="Sigue unos pasos simples antes de abrir un ticket. No necesitas conocimientos técnicos."
                />
            </div>

            {!issue ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {ISSUES.map(({ id, title, description, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => chooseIssue(id)}
                            className="app-surface group flex min-h-32 items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/25 hover:bg-white/[0.05]"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                <Icon size={20} />
                            </span>
                            <span>
                                <span className="block font-semibold text-white">{title}</span>
                                <span className="mt-1 block text-sm leading-6 text-slate-400">{description}</span>
                                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300">
                                    Revisar <ArrowRight size={13} />
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : resolved ? (
                <Surface className="p-6 text-center sm:p-8">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                        <CheckCircle2 size={28} />
                    </span>
                    <h2 className="mt-5 text-2xl font-bold text-white">¡Perfecto!</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                        Si tu conexión volvió a funcionar no necesitas abrir un ticket. Puedes regresar al inicio.
                    </p>
                    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                        <button type="button" onClick={() => navigate('/client')} className="primary-action">Volver al inicio</button>
                        <button type="button" onClick={reset} className="secondary-action"><RotateCcw size={16} /> Revisar otro problema</button>
                    </div>
                </Surface>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
                    <Surface className="p-5">
                        <div className="flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                {IssueIcon ? <IssueIcon size={19} /> : null}
                            </span>
                            <div>
                                <StatusPill tone="info">Paso {step + 1} de {issue.steps.length}</StatusPill>
                                <h2 className="mt-3 text-lg font-bold text-white">{issue.title}</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-400">{issue.description}</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            {issue.steps.map((_, index) => (
                                <div key={index} className={`h-1.5 rounded-full ${index <= step ? 'bg-cyan-400' : 'bg-white/8'}`} />
                            ))}
                        </div>
                    </Surface>

                    <Surface className="p-5 sm:p-7">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Haz esto ahora</p>
                        <p className="mt-4 text-lg font-semibold leading-8 text-white">{issue.steps[step]}</p>

                        <div className="mt-8 rounded-xl border border-white/8 bg-black/10 p-4">
                            <p className="text-sm font-semibold text-slate-200">¿Después de este paso ya funciona?</p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button type="button" onClick={() => setResolved(true)} className="primary-action flex-1">
                                    <CheckCircle2 size={16} /> Sí, ya funciona
                                </button>
                                {step < issue.steps.length - 1 ? (
                                    <button type="button" onClick={nextStep} className="secondary-action flex-1">
                                        No, continuar <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button type="button" onClick={createTicket} className="secondary-action flex-1">
                                        <LifeBuoy size={16} /> Crear ticket
                                    </button>
                                )}
                            </div>
                        </div>
                    </Surface>
                </div>
            )}

            <Surface className="flex items-start gap-3 p-4">
                <Router className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                <p className="text-sm leading-6 text-slate-400">
                    No desconectes ni manipules el conector de fibra óptica. Si observas un cable roto o una luz LOS roja persistente, lo más conveniente es crear un ticket.
                </p>
            </Surface>
        </div>
    );
};

export default ConnectionDoctor;
