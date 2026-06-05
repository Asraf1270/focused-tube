import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

const PRESET_COLORS = [
  '#3EA6FF', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  '#F7B955', '#2BA640', '#E8453C', '#7C4DFF',
];

const COMMON_EMOJIS = [
  '📚', '💻', '🎨', '🔬', '💼', '🎵', '🌍', '📊',
  '🎮', '📝', '🗣️', '🧠', '⚡', '🔧', '🎯', '💡',
];

export default function CategoryForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false,
  categories = [],
  className = '' 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3EA6FF',
    emoji: '📚',
    icon: '',
    parentId: null,
  });

  const [errors, setErrors] = useState({});

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        color: initialData.color_hex || '#3EA6FF',
        emoji: initialData.emoji || '📚',
        icon: initialData.icon || '',
        parentId: initialData.parent_id || null,
      });
    }
  }, [initialData]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Category name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      color: formData.color,
      emoji: formData.emoji || null,
      icon: formData.icon || null,
      parentId: formData.parentId,
    });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Get available parent categories (exclude self and children)
  const availableParents = categories.filter(c => {
    if (!initialData) return true;
    return c.id !== initialData.id && c.parent_id !== initialData.id;
  });

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1.5">
            Category Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Web Development, Machine Learning"
            className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                     text-body-base text-text-primary placeholder:text-text-tertiary
                     focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                     transition-colors"
            maxLength={100}
            autoFocus
          />
          {errors.name && (
            <p className="mt-1 text-body-xs text-error">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Optional description for this category"
            rows={3}
            className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                     text-body-base text-text-primary placeholder:text-text-tertiary
                     focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                     resize-none transition-colors"
            maxLength={500}
          />
          <div className="flex justify-between mt-1">
            {errors.description && (
              <p className="text-body-xs text-error">{errors.description}</p>
            )}
            <p className="text-caption text-text-tertiary ml-auto">
              {formData.description.length}/500
            </p>
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1.5">
            Color
          </label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                className={`
                  w-8 h-8 rounded-full transition-all duration-200
                  ${formData.color === color 
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-raised scale-110' 
                    : 'hover:scale-110'
                  }
                `}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
            {/* Custom color input */}
            <div className="relative">
              <input
                type="color"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="absolute inset-0 opacity-0 w-8 h-8 cursor-pointer"
              />
              <div 
                className="w-8 h-8 rounded-full border-2 border-dashed border-border-default
                         flex items-center justify-center"
                style={{ backgroundColor: formData.color }}
              >
                <span className="text-caption">+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emoji Picker */}
        <div>
          <label className="block text-body-sm font-medium text-text-primary mb-1.5">
            Icon
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleChange('emoji', emoji)}
                className={`
                  w-10 h-10 flex items-center justify-center text-xl rounded-lg transition-all
                  ${formData.emoji === emoji 
                    ? 'bg-accent-blue/20 ring-2 ring-accent-blue' 
                    : 'bg-surface-overlay hover:bg-surface-hover'
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Parent Category */}
        {availableParents.length > 0 && (
          <div>
            <label className="block text-body-sm font-medium text-text-primary mb-1.5">
              Parent Category
            </label>
            <select
              value={formData.parentId || ''}
              onChange={(e) => handleChange('parentId', e.target.value || null)}
              className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                       text-body-base text-text-primary
                       focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                       cursor-pointer transition-colors"
            >
              <option value="">None (root category)</option>
              {availableParents.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {'—'.repeat(cat.depth || 0)} {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border-subtle">
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
        >
          {initialData ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}