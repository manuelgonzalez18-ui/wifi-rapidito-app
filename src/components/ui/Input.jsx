import { forwardRef } from 'react';
import { cn } from '../../utils';

const Input = forwardRef(({ label, className, icon: Icon, error, ...props }, ref) => {
    return (
        <div className="w-full space-y-2 text-left">
            {label && (
                <label className="block text-[10px] font-black text-slate-400 ml-1 uppercase tracking-[0.2em] opacity-80">
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
                        "glass-input w-full rounded-2xl px-5 py-4 text-sm font-medium",
                        "placeholder:text-slate-600 outline-none transition-all duration-500",
                        Icon && "pl-12",
                        error && "border-red-500/50 focus:border-red-500",
                        className
                    )}
                    style={{ color: 'white' }}
                    {...props}
                />

                {/* Visual indicator for focus */}
                <div className="absolute inset-0 rounded-2xl border border-neon-blue/0 group-focus-within:border-neon-blue/40 pointer-events-none transition-all duration-500" />
            </div>
            {error && (
                <p className="text-[10px] text-red-500 ml-1 mt-1 font-bold uppercase tracking-widest">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
