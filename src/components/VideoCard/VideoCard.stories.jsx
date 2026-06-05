import VideoCard from './VideoCard';
import VideoCardSkeleton from './VideoCardSkeleton';

// Example data
const sampleVideo = {
  thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  title: 'Building a Complete Design System with React and Tailwind CSS',
  channel: 'FocusedTube Learning',
  duration: 1847, // 30:47
  youtubeId: 'dQw4w9WgXcQ',
  viewCount: 1250000,
  publishedAt: '2024-01-15T10:30:00Z',
  progress: 920,
  status: 'in_progress',
  isBookmarked: true,
};

// Example usage in a grid
export function VideoGridExample() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-surface-base">
      {/* Default Video Card */}
      <VideoCard {...sampleVideo} to={`/watch/${sampleVideo.youtubeId}`} />
      
      {/* Completed Video */}
      <VideoCard
        {...sampleVideo}
        title="React Performance Optimization Techniques"
        status="completed"
        progress={1847}
        isBookmarked={false}
        isLiked={true}
        onBookmark={(id) => console.log('Bookmark:', id)}
        onLike={(id) => console.log('Like:', id)}
      />
      
      {/* Watch Later Video */}
      <VideoCard
        {...sampleVideo}
        title="Advanced TypeScript Patterns"
        status="watch_later"
        progress={0}
        onWatchLater={(id) => console.log('Watch later:', id)}
        onAddToPlaylist={(id) => console.log('Add to playlist:', id)}
      />
      
      {/* With Description */}
      <VideoCard
        {...sampleVideo}
        title="Building Scalable APIs"
        showDescription={true}
        description="Learn how to build production-ready APIs with Node.js, Express, and PostgreSQL. This comprehensive tutorial covers everything from setup to deployment."
      />
      
      {/* Compact Variant */}
      <VideoCard
        {...sampleVideo}
        variant="compact"
        title="Quick Tip: React Hooks"
        duration={180}
      />
      
      {/* Horizontal Variant */}
      <VideoCard
        {...sampleVideo}
        variant="horizontal"
        title="Full-Stack Development Course"
        description="Complete guide to becoming a full-stack developer in 2024"
      />
      
      {/* Featured Variant */}
      <VideoCard
        {...sampleVideo}
        variant="featured"
        title="The Complete Web Development Bootcamp"
        description="Master HTML, CSS, JavaScript, React, Node.js, and more in this comprehensive bootcamp-style course."
        viewCount={2500000}
        publishedAt="2023-06-01T08:00:00Z"
      />
      
      {/* Loading Skeletons */}
      <VideoCardSkeleton />
      <VideoCardSkeleton variant="compact" />
      <VideoCardSkeleton variant="horizontal" />
    </div>
  );
}

// Individual variant examples
export const DefaultCard = () => (
  <div className="w-80">
    <VideoCard {...sampleVideo} />
  </div>
);

export const CompactCard = () => (
  <div className="w-80">
    <VideoCard {...sampleVideo} variant="compact" />
  </div>
);

export const HorizontalCard = () => (
  <div className="w-[500px]">
    <VideoCard {...sampleVideo} variant="horizontal" />
  </div>
);

export const FeaturedCard = () => (
  <div className="w-[600px]">
    <VideoCard {...sampleVideo} variant="featured" />
  </div>
);

export const LoadingCard = () => (
  <div className="w-80">
    <VideoCardSkeleton />
  </div>
);