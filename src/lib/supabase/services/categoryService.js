import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

/**
 * Category Service
 * Handles all category-related database operations
 */
export const categoryService = {
  /**
   * Get all categories with stats
   */
  async getCategories() {
    try {
      const { data, error } = await supabase
        .rpc('get_categories_with_stats');

      if (error) {
        throw handleSupabaseError(error, { operation: 'getCategories' });
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  /**
   * Create a new category
   */
  async createCategory({ name, description, color, icon, emoji, parentId }) {
    try {
      const { data, error } = await supabase
        .rpc('create_category', {
          p_name: name,
          p_description: description || null,
          p_color_hex: color || '#3EA6FF',
          p_icon: icon || null,
          p_emoji: emoji || null,
          p_parent_id: parentId || null,
        });

      if (error) {
        throw handleSupabaseError(error, { 
          operation: 'createCategory',
          categoryName: name,
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  /**
   * Update a category
   */
  async updateCategory(categoryId, updates) {
    try {
      const { data, error } = await supabase
        .rpc('update_category', {
          p_category_id: categoryId,
          p_name: updates.name,
          p_description: updates.description,
          p_color_hex: updates.color,
          p_icon: updates.icon,
          p_emoji: updates.emoji,
          p_sort_order: updates.sortOrder,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'updateCategory',
          categoryId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  /**
   * Delete a category
   */
  async deleteCategory(categoryId) {
    try {
      const { data, error } = await supabase
        .rpc('delete_category', {
          p_category_id: categoryId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'deleteCategory',
          categoryId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  /**
   * Assign video to category
   */
  async assignVideoToCategory(videoId, categoryId) {
    try {
      const { data, error } = await supabase
        .rpc('assign_video_to_category', {
          p_video_id: videoId,
          p_category_id: categoryId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'assignVideoToCategory',
          videoId,
          categoryId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error assigning video to category:', error);
      throw error;
    }
  },

  /**
   * Remove video from category
   */
  async removeVideoFromCategory(videoId, categoryId) {
    try {
      const { data, error } = await supabase
        .rpc('remove_video_from_category', {
          p_video_id: videoId,
          p_category_id: categoryId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'removeVideoFromCategory',
          videoId,
          categoryId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error removing video from category:', error);
      throw error;
    }
  },

  /**
   * Get videos in a category
   */
  async getCategoryVideos(categoryId) {
    try {
      const { data, error } = await supabase
        .rpc('get_category_videos', {
          p_category_id: categoryId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'getCategoryVideos',
          categoryId,
        });
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching category videos:', error);
      throw error;
    }
  },

  /**
   * Bulk assign videos to category
   */
  async bulkAssignVideos(videoIds, categoryId) {
    try {
      const results = [];
      
      for (const videoId of videoIds) {
        const result = await this.assignVideoToCategory(videoId, categoryId);
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error('Error bulk assigning videos:', error);
      throw error;
    }
  },

  /**
   * Reorder categories
   */
  async reorderCategories(categoryIds) {
    try {
      const updates = categoryIds.map((id, index) => 
        this.updateCategory(id, { sortOrder: index })
      );

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering categories:', error);
      throw error;
    }
  },
};

export default categoryService;