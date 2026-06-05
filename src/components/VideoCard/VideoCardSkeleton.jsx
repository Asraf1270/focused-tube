export default function VideoCardSkeleton({ variant = 'default', className = '' }) {
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-3 p-2 bg-surface-raised rounded-lg animate-pulse ${className}`}>
        <div className="w-24 h-14 bg-surface-hover rounded-md flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-hover rounded w-3/4" />
          <div className="h-2 bg-surface-hover rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={`flex gap-4 p-3 bg-surface-raised rounded-xl animate-pulse ${className}`}>
        <div className="w-40 h-24 bg-surface-hover rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <div className="h-4 bg-surface-hover rounded w-full" />
            <div className="h-4 bg-surface-hover rounded w-2/3" />
          </div>
          <div className="h-3 bg-surface-hover rounded w-24" />
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className={`bg-surface-raised rounded-xl overflow-hidden animate-pulse ${className}`}>
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-surface-hover" />
      
      {/* Content placeholder */}
      <div className="p-3 space-y-3">
        {/* Title lines */}
        <div className="space-y-1.5">
          <div className="h-4 bg-surface-hover rounded w-full" />
          <div className="h-4 bg-surface-hover rounded w-3/4" />
        </div>
        
        {/* Channel & meta */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-surface-hover flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-surface-hover rounded w-24" />
            <div className="h-3 bg-surface-hover rounded w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}