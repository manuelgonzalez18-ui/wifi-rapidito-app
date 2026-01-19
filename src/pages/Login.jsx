import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, Wifi, ArrowRight, ShieldCheck } from 'lucide-react';
import useAuthStore from '../auth/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isLoading, error } = useAuthStore();

    const [formData, setFormData] = useState({ username: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(formData.username, formData.password);
            if (user.role === 'staff') {
                navigate('/staff');
            } else {
                navigate('/client');
            }
        } catch (err) {
            // Error handled in store
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center mesh-bg overflow-hidden relative selection:bg-neon-blue/30">
            {/* Background Decorative Blur */}
            <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-primary-600/10 rounded-full blur-[100px] animate-pulse" />
                <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-secondary-600/10 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="mb-10 text-center space-y-4">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                        className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary-600 via-secondary-600 to-indigo-600 shadow-[0_0_50px_-12px_rgba(30,64,175,0.5)] mb-2 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ repeat: Infinity, duration: 4 }}
                        >
                            <Wifi className="text-white w-10 h-10 relative z-10" strokeWidth={2} />
                        </motion.div>
                    </motion.div>

                    <div className="space-y-1">
                        <motion.h1
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-5xl font-extrabold text-white tracking-tighter"
                            style={{ fontFamily: "'Syncopate', sans-serif" }}
                        >
                            WIFI <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-primary-400">RAPIDITO</span>
                        </motion.h1>
                        <motion.p
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="text-slate-400 text-sm font-medium tracking-widest uppercase"
                        >
                            Future-Ready Connectivity
                        </motion.p>
                    </div>
                </div>

                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", damping: 25 }}
                >
                    <Card className="glass-panel border-white/5 ring-1 ring-white/10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-5">
                                <Input
                                    label={<span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Portal de Acceso</span>}
                                    icon={User}
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="glass-input focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue/40"
                                    required
                                />
                                <Input
                                    type="password"
                                    icon={Lock}
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="glass-input focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue/40"
                                    required
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    className="w-full text-base font-bold py-4 bg-gradient-to-r from-neon-blue to-indigo-600 hover:from-primary-400 hover:to-indigo-500 shadow-[0_0_25px_-5px_rgba(0,242,255,0.4)] transition-all duration-300 group"
                                    isLoading={isLoading}
                                >
                                    CONECTAR AHORA <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </form>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-10 flex flex-col items-center space-y-4"
                >
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">
                        <ShieldCheck className="w-4 h-4 text-emerald-500/50" />
                        SECURE ENCRYPTED ACCESS
                    </div>
                </motion.div>
            </div>

            {/* Custom Scanline Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] animate-pulse bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-50"></div>
        </div>
    );
};

export default LoginPage;
