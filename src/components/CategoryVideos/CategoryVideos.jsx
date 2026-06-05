import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { categoryService } from '@/lib/supabase/services/categoryService';
import VideoCard from '@/components/VideoCard/VideoCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function CategoryVideos({ category, onClose, className = '' }) {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['category-videos', category.id],
    queryFn: () => categoryService.getCategoryVideos(category.id),
    enabled: !!category,
  });

  return (
    <div className={`bg-surface-raised border border-border-subtle rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{category.emoji}</span>
            <h3 className="text-heading-sm font-semibold text-text-primary">
              {category.name}
            </h3>
            <span className="px-2 py-0.5 bg-surface-hover text-body-xs text-text-secondary rounded-full">
              {category.video_count} videos
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary rounded-lg 
                     hover:bg-surface-hover transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Videos List */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <LoadingSpinner />
        ) : videos.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-text-tertiary mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-body-sm text-text-tertiary">
              No videos in this category yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map((video) => (
              <motion.div
                key={video.video_id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <VideoCard
                  thumbnail={video.thumbnail_url}
                  title={video.title}
                  channel={video.channel_name}
                  duration={video.duration_seconds}
                  youtubeId={video.youtube_id}
                  variant="compact"
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}