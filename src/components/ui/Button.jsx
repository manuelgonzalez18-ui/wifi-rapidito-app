import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils';

const Button = ({ children, variant = 'primary', size = 'md', isLoading, className, ...props }) => {
    const variants = {
        primary: "bg-gradient-to-r from-primary-600 to-indigo-600 text-white border-white/10 shadow-[0_0_20px_-5px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_-5px_rgba(0,242,255,0.5)] active:shadow-inner",
        secondary: "bg-white/5 backdrop-blur-md text-white border-white/10 hover:bg-white/10 shadow-lg",
        outline: "bg-transparent text-slate-100 border-white/20 hover:border-neon-blue hover:text-white",
        ghost: "bg-transparent text-slate-400 hover:bg-white/5 hover:text-white border-transparent shadow-none"
    };

    const sizes = {
        sm: "px-4 py-2 text-xs",
        md: "px-7 py-4 text-sm",
        lg: "px-10 py-5 text-base",
    };

    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ scale: 1.01 }}
            className={cn(
                "relative inline-flex items-center justify-center font-black uppercase tracking-[0.2em] rounded-2xl transition-all duration-300 border overflow-hidden group",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading}
            {...props}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

            {isLoading && (
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-white" />
            )}

            <span className="relative z-10 flex items-center gap-2 drop-shadow-md">
                {children}
            </span>

            {/* Inner Border Glow */}
            <div className="absolute inset-0 border border-white/0 group-hover:border-white/10 rounded-2xl transition-all duration-300 pointer-events-none" />
        </motion.button>
    );
};

export default Button;
