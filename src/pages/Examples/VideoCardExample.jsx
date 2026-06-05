import { useState } from 'react';
import VideoCard from '@/components/VideoCard/VideoCard';
import VideoCardSkeleton from '@/components/VideoCard/VideoCardSkeleton';
import toast from 'react-hot-toast';

export default function VideoCardExample() {
  const [videos, setVideos] = useState([
    {
      id: '1',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      title: 'Building a Complete Design System with React and Tailwind CSS',
      channel: 'FocusedTube Learning',
      duration: 1847,
      youtubeId: 'dQw4w9WgXcQ',
      viewCount: 1250000,
      publishedAt: '2024-01-15T10:30:00Z',
      progress: 920,
      status: 'in_progress',
      isBookmarked: true,
      isLiked: false,
    },
    // Add more videos...
  ]);

  const handleBookmark = (videoId) => {
    setVideos(prev =>
      prev.map(v =>
        v.id === videoId ? { ...v, isBookmarked: !v.isBookmarked } : v
      )
    );
    toast.success('Bookmark updated!');
  };

  const handleLike = (videoId) => {
    setVideos(prev =>
      prev.map(v =>
        v.id === videoId ? { ...v, isLiked: !v.isLiked } : v
      )
    );
  };

  const handleWatchLater = (videoId) => {
    toast.success('Added to Watch Later!');
  };

  const handleAddToPlaylist = (videoId) => {
    toast.success('Add to playlist modal opened');
  };

  return (
    <div className="min-h-screen bg-surface-base p-8">
      <h1 className="text-display-md font-bold text-text-primary mb-8">
        VideoCard Component Examples
      </h1>

      {/* Grid Layout */}
      <section className="mb-12">
        <h2 className="text-heading-lg font-semibold text-text-primary mb-4">
          Default Grid Layout
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              {...video}
              to={`/watch/${video.youtubeId}`}
              onBookmark={handleBookmark}
              onLike={handleLike}
              onWatchLater={handleWatchLater}
              onAddToPlaylist={handleAddToPlaylist}
              onMoreOptions={(id) => console.log('More options:', id)}
            />
          ))}
        </div>
      </section>

      {/* Different Variants */}
      <section className="mb-12">
        <h2 className="text-heading-lg font-semibold text-text-primary mb-4">
          Card Variants
        </h2>
        <div className="space-y-4">
          {/* Featured */}
          <VideoCard
            {...videos[0]}
            variant="featured"
            description="Learn how to build a complete design system from scratch using React, Tailwind CSS, and modern best practices."
            showDescription
          />

          {/* Horizontal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VideoCard
              {...videos[0]}
              variant="horizontal"
              description="Quick overview of the design system"
              showDescription
            />
            <VideoCard
              {...videos[0]}
              variant="horizontal"
              title="Another video title"
              description="Another description"
              showDescription
            />
          </div>

          {/* Compact List */}
          <div className="space-y-2">
            <VideoCard {...videos[0]} variant="compact" title="Quick video 1" />
            <VideoCard {...videos[0]} variant="compact" title="Quick video 2" />
            <VideoCard {...videos[0]} variant="compact" title="Quick video 3" />
          </div>
        </div>
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-heading-lg font-semibold text-text-primary mb-4">
          Loading States
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}