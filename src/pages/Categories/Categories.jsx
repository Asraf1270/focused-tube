import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';
import CategoryCard from '@/components/CategoryCard/CategoryCard';
import CategoryForm from '@/components/CategoryForm/CategoryForm';
import CategoryVideos from '@/components/CategoryVideos/CategoryVideos';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Categories() {
  useDocumentTitle('Categories - FocusedTube');
  
  const {
    categories,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreating,
  } = useCategories();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);

  const handleCreate = useCallback(async (data) => {
    await createCategory(data);
    setShowCreateModal(false);
  }, [createCategory]);

  const handleUpdate = useCallback(async (data) => {
    await updateCategory(editingCategory.id, data);
    setEditingCategory(null);
  }, [updateCategory, editingCategory]);

  const handleDelete = useCallback(async () => {
    if (deletingCategory) {
      await deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      if (selectedCategory?.id === deletingCategory.id) {
        setSelectedCategory(null);
      }
    }
  }, [deleteCategory, deletingCategory, selectedCategory, setSelectedCategory]);

  // Group categories by depth for hierarchy display
  const rootCategories = categories.filter(c => !c.parent_id);
  const getChildCategories = (parentId) => 
    categories.filter(c => c.parent_id === parentId);

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-md font-bold text-text-primary mb-2">
              Categories
            </h1>
            <p className="text-body-lg text-text-secondary">
              Organize your learning content
            </p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            size="lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Category
          </Button>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          {/* Categories List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 bg-surface-raised rounded-xl animate-pulse" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h-1a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-1" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.385 6.585a2.1 2.1 0 00-2.97-2.97L9 12v3h3l8.385-8.415zM16 8l-5 5" />
                  </svg>
                }
                title="No categories yet"
                description="Create categories to organize your learning videos by topic, difficulty, or any system that works for you."
                action={
                  <Button onClick={() => setShowCreateModal(true)} variant="primary">
                    Create Your First Category
                  </Button>
                }
              />
            ) : (
              <div className="space-y-6">
                {rootCategories.map((category) => (
                  <CategoryGroup
                    key={category.id}
                    category={category}
                    children={getChildCategories(category.id)}
                    onEdit={setEditingCategory}
                    onDelete={setDeletingCategory}
                    onView={setViewingCategory}
                    isSelected={selectedCategory?.id === category.id}
                    onSelect={() => setSelectedCategory(
                      selectedCategory?.id === category.id ? null : category
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Category Videos Panel */}
          <AnimatePresence>
            {viewingCategory && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-96 flex-shrink-0"
              >
                <CategoryVideos
                  category={viewingCategory}
                  onClose={() => setViewingCategory(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Category Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Category"
      >
        <CategoryForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateModal(false)}
          isSubmitting={isCreating}
          categories={categories}
        />
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Edit Category"
      >
        {editingCategory && (
          <CategoryForm
            initialData={editingCategory}
            onSubmit={handleUpdate}
            onCancel={() => setEditingCategory(null)}
            categories={categories}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingCategory}
        onConfirm={handleDelete}
        onCancel={() => setDeletingCategory(null)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This will remove the category but won't delete any videos.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

/**
 * Category Group Component (handles hierarchy)
 */
function CategoryGroup({ category, children, onEdit, onDelete, onView, isSelected, onSelect }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div>
      <CategoryCard
        category={category}
        onEdit={() => onEdit(category)}
        onDelete={() => onDelete(category)}
        onView={() => onView(category)}
        isSelected={isSelected}
        onSelect={onSelect}
        hasChildren={children.length > 0}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded(!isExpanded)}
      />
      
      {/* Child Categories */}
      <AnimatePresence>
        {isExpanded && children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="ml-8 mt-2 space-y-2 border-l-2 border-border-subtle pl-4"
          >
            {children.map((child) => (
              <CategoryCard
                key={child.id}
                category={child}
                onEdit={() => onEdit(child)}
                onDelete={() => onDelete(child)}
                onView={() => onView(child)}
                isSelected={isSelected}
                onSelect={onSelect}
                isChild
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}