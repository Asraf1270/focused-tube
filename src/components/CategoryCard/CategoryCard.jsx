import { motion } from 'framer-motion';
import { formatDuration } from '@/lib/utils/formatters';

export default function CategoryCard({ 
  category, 
  onEdit, 
  onDelete, 
  onView,
  isSelected = false,
  onSelect,
  hasChildren = false,
  isExpanded = true,
  onToggleExpand,
  isChild = false,
  className = '' 
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        relative bg-surface-raised rounded-xl border transition-all duration-200 cursor-pointer
        ${isSelected 
          ? 'border-accent-blue shadow-lg shadow-accent-blue/5' 
          : 'border-border-subtle hover:border-border-default hover:shadow-elevation-2'
        }
        ${className}
      `}
      onClick={onSelect}
    >
      {/* Color Indicator */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: category.color_hex }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {/* Expand/Collapse Button */}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
                className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <motion.svg
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </motion.svg>
              </button>
            )}

            {/* Icon/Emoji */}
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${category.color_hex}15` }}
            >
              {category.emoji || category.icon || '📁'}
            </div>

            {/* Category Info */}
            <div className="min-w-0">
              <h3 className="text-body-base font-semibold text-text-primary truncate">
                {category.name}
              </h3>
              {category.description && (
                <p className="text-body-xs text-text-tertiary truncate mt-0.5">
                  {category.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1 text-body-xs text-text-tertiary">
                <span>{category.video_count} videos</span>
                {category.total_duration_seconds > 0 && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(category.total_duration_seconds)}</span>
                  </>
                )}
                {hasChildren && (
                  <>
                    <span>•</span>
                    <span>{isExpanded ? 'Expanded' : 'Collapsed'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView?.(category);
              }}
              className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-hover 
                       rounded-lg transition-colors"
              title="View videos"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(category);
              }}
              className="p-2 text-text-tertiary hover:text-text-primary hover:bg-surface-hover 
                       rounded-lg transition-colors"
              title="Edit category"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(category);
              }}
              className="p-2 text-text-tertiary hover:text-error hover:bg-error/10 
                       rounded-lg transition-colors"
              title="Delete category"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}