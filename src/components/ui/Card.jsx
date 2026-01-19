import { motion } from 'framer-motion';
import { cn } from '../../utils';

const Card = ({ children, className, hover = false, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "bg-white/80 backdrop-blur-xl border border-white/40 shadow-sm rounded-2xl p-6",
                hover && "hover:shadow-lg hover:bg-white/90 hover:-translate-y-1 transition-all duration-300",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default Card;
