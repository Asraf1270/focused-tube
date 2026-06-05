import { motion } from 'framer-motion';

export default function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className = '' 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-surface-raised border border-border-subtle rounded-xl p-8 ${className}`}
    >
      <div className="flex flex-col items-center text-center py-8">
        {/* Icon */}
        {icon && (
          <div className="w-20 h-20 rounded-full bg-accent-blue/5 flex items-center justify-center mb-6 text-accent-blue">
            {icon}
          </div>
        )}

        {/* Title */}
        {title && (
          <h3 className="text-heading-sm font-semibold text-text-primary mb-2">
            {title}
          </h3>
        )}

        {/* Description */}
        {description && (
          <p className="text-body-base text-text-secondary max-w-md mb-4">
            {description}
          </p>
        )}

        {/* Action */}
        {action && (
          <div className="mt-2">
            {action}
          </div>
        )}
      </div>
    </motion.div>
  );
}