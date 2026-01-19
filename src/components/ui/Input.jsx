import { forwardRef } from 'react';
import { cn } from '../../utils';

const Input = forwardRef(({ label, className, icon: Icon, error, ...props }, ref) => {
    return (
        <div className="w-full space-y-2">
            {label && (
                <label className="block text-[10px] font-black text-slate-500 ml-1 uppercase tracking-[0.2em]">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-neon-blue transition-all duration-300 z-10">
                        <Icon size={18} />
                    </div>
                )}
                <input
                    ref={ref}
                    className={cn(
                        "w-full bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all duration-500 font-medium",
                        "hover:bg-white/[0.05] hover:border-white/10",
                        "focus:bg-white/[0.08] focus:border-neon-blue/30 focus:ring-4 focus:ring-neon-blue/5",
                        "disabled:opacity-50 disabled:bg-slate-900",
                        Icon && "pl-12",
                        error && "border-red-500/50 focus:border-red-500 focus:ring-red-500/10",
                        className
                    )}
                    {...props}
                />

                {/* Glow bar effect */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-transparent via-neon-blue to-transparent transition-all duration-500 group-focus-within:w-1/2 opacity-0 group-focus-within:opacity-100" />
            </div>
            {error && (
                <p className="text-[10px] text-red-400 ml-1 mt-1 font-bold uppercase tracking-widest animate-slide-up">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
