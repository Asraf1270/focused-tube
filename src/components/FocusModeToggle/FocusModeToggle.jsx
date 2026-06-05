import { motion } from 'framer-motion';

export default function FocusModeToggle({ isActive, onToggle, className = '' }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onToggle}
      className={`
        relative inline-flex items-center gap-2 px-4 py-2 rounded-full
        text-body-sm font-medium transition-all duration-300
        ${isActive 
          ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
          : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
        }
        ${className}
      `}
      aria-label={isActive ? 'Exit focus mode' : 'Enter focus mode'}
    >
      <motion.div
        animate={{ rotate: isActive ? 360 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isActive ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
            <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </motion.div>
      <span>{isActive ? 'Exit Focus' : 'Focus Mode'}</span>
    </motion.button>
  );
}