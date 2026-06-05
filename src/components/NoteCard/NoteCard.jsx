import { useState } from 'react';
import { motion } from 'framer-motion';
import NoteEditor from '@/components/NoteEditor/NoteEditor';

const TYPE_CONFIG = {
  general: { icon: '📝', label: 'General', color: '#3EA6FF' },
  timestamp: { icon: '⏱️', label: 'Timestamp', color: '#F7B955' },
  key_concept: { icon: '💡', label: 'Key Concept', color: '#7C4DFF' },
  question: { icon: '❓', label: 'Question', color: '#E8453C' },
  action_item: { icon: '✅', label: 'Action Item', color: '#2BA640' },
  summary: { icon: '📋', label: 'Summary', color: '#45B7D1' },
  code_snippet: { icon: '💻', label: 'Code', color: '#96CEB4' },
};

export default function NoteCard({ 
  note, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete,
  onSeekTo,
  isSaving = false,
  className = '' 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const typeConfig = TYPE_CONFIG[note.type] || TYPE_CONFIG.general;

  const formatTimestamp = (seconds) => {
    if (!seconds && seconds !== 0) return null;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  if (isEditing) {
    return (
      <div className="p-4 border border-accent-blue rounded-lg bg-surface-overlay">
        <NoteEditor
          initialData={note}
          onSave={onSave}
          onCancel={onCancel}
          isSubmitting={isSaving}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`group relative p-4 border-b border-border-subtle hover:bg-surface-hover/30 
                  transition-colors ${note.is_pinned ? 'bg-accent-blue/5' : ''} ${className}`}
      style={{ borderLeftColor: note.color_hex, borderLeftWidth: '3px' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Type Badge */}
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium"
            style={{ backgroundColor: `${note.color_hex}15`, color: note.color_hex }}
          >
            <span>{typeConfig.icon}</span>
            <span>{typeConfig.label}</span>
          </span>

          {/* Importance Stars */}
          {note.importance_rating > 0 && (
            <span className="text-yellow-400 text-sm">
              {'★'.repeat(note.importance_rating)}
            </span>
          )}

          {/* Pinned Badge */}
          {note.is_pinned && (
            <span className="text-accent-blue" title="Pinned note">📌</span>
          )}
        </div>

        {/* Timestamp */}
        {note.timestamp_seconds !== null && (
          <button
            onClick={() => onSeekTo?.(note.timestamp_seconds)}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 text-accent-blue
                     text-caption font-mono rounded-full hover:bg-accent-blue/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            {formatTimestamp(note.timestamp_seconds)}
          </button>
        )}
      </div>

      {/* Title */}
      {note.title && (
        <h4 className="text-body-sm font-semibold text-text-primary mb-1">{note.title}</h4>
      )}

      {/* Content */}
      <div className="text-body-sm text-text-secondary whitespace-pre-wrap line-clamp-4 mb-2">
        {note.content}
      </div>

      {/* Tags */}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {note.tags.map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 bg-surface-hover text-caption text-text-tertiary rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-caption text-text-tertiary">
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
        
        {/* Actions (show on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(note.id)}
            className="px-2 py-1 text-accent-blue hover:bg-accent-blue/10 rounded transition-colors"
            title="Edit note"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-2 py-1 text-error hover:bg-error/10 rounded transition-colors"
            title="Delete note"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-surface-raised/95 flex items-center justify-center rounded-lg z-10">
          <div className="text-center">
            <p className="text-body-sm text-text-primary mb-2">Delete this note?</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => { onDelete(note.id); setShowDeleteConfirm(false); }}
                className="px-3 py-1 bg-error text-white rounded text-sm hover:bg-error/90"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 bg-surface-hover rounded text-sm hover:bg-surface-active"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}