import { motion } from 'framer-motion';
import { cn } from '../../utils';

const Card = ({ children, className, hover = false, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "bg-[#0f172a]/40 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8",
                hover && "hover:border-white/20 hover:bg-[#0f172a]/50 transition-all duration-300",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default Card;
