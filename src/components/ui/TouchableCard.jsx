import { motion } from 'framer-motion';

export default function TouchableCard({ 
  children, 
  onPress, 
  onLongPress,
  className = '',
  ...props 
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onTouchStart={(e) => {
        // Long press detection
        const timeout = setTimeout(() => onLongPress?.(e), 500);
        e.currentTarget.dataset.longPressTimeout = timeout;
      }}
      onTouchEnd={(e) => {
        clearTimeout(e.currentTarget.dataset.longPressTimeout);
      }}
      onClick={onPress}
      className={`
        cursor-pointer select-none
        active:bg-surface-hover/50
        transition-colors duration-150
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}