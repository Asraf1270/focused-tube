import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useVideoStore = create(
  persist(
    (set, get) => ({
      watchHistory: [],
      likedVideos: [],
      watchLater: [],
      
      addToHistory: (video) =>
        set((state) => ({
          watchHistory: [
            { ...video, watchedAt: new Date().toISOString() },
            ...state.watchHistory.filter((v) => v.id !== video.id),
          ].slice(0, 100), // Keep last 100 videos
        })),
      
      toggleLike: (videoId) =>
        set((state) => {
          const isLiked = state.likedVideos.some((v) => v.id === videoId);
          return {
            likedVideos: isLiked
              ? state.likedVideos.filter((v) => v.id !== videoId)
              : [...state.likedVideos, { id: videoId, likedAt: new Date().toISOString() }],
          };
        }),
      
      clearHistory: () => set({ watchHistory: [] }),
    }),
    {
      name: 'video-storage',
      partialize: (state) => ({
        watchHistory: state.watchHistory,
        likedVideos: state.likedVideos,
        watchLater: state.watchLater,
      }),
    }
  )
);

export default useVideoStore;