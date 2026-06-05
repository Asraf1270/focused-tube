import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '@/lib/supabase/services/categoryService';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Custom hook for category management
 */
export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch categories
  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    enabled: !!user,
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully! 🎉');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...updates }) => categoryService.updateCategory(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-videos'] });
      toast.success(`"${data.category_name}" deleted`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });

  // Assign video mutation
  const assignVideoMutation = useMutation({
    mutationFn: ({ videoId, categoryId }) => 
      categoryService.assignVideoToCategory(videoId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-videos'] });
      toast.success('Video added to category');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to assign video');
    },
  });

  // Remove video mutation
  const removeVideoMutation = useMutation({
    mutationFn: ({ videoId, categoryId }) =>
      categoryService.removeVideoFromCategory(videoId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-videos'] });
      toast.success('Video removed from category');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove video');
    },
  });

  // Create category
  const createCategory = useCallback(async (data) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  // Update category
  const updateCategory = useCallback(async (id, updates) => {
    return updateMutation.mutateAsync({ id, ...updates });
  }, [updateMutation]);

  // Delete category
  const deleteCategory = useCallback(async (id) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  // Assign video to category
  const assignVideo = useCallback(async (videoId, categoryId) => {
    return assignVideoMutation.mutateAsync({ videoId, categoryId });
  }, [assignVideoMutation]);

  // Remove video from category
  const removeVideo = useCallback(async (videoId, categoryId) => {
    return removeVideoMutation.mutateAsync({ videoId, categoryId });
  }, [removeVideoMutation]);

  return {
    // State
    categories,
    isLoading,
    error,
    selectedCategory,
    
    // Actions
    setSelectedCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    assignVideo,
    removeVideo,
    refetch,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export default useCategories;