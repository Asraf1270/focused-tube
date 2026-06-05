import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';

const NOTE_TYPES = [
  { value: 'general', label: 'General', icon: '📝', color: '#3EA6FF' },
  { value: 'timestamp', label: 'Timestamp', icon: '⏱️', color: '#F7B955' },
  { value: 'key_concept', label: 'Key Concept', icon: '💡', color: '#7C4DFF' },
  { value: 'question', label: 'Question', icon: '❓', color: '#E8453C' },
  { value: 'action_item', label: 'Action Item', icon: '✅', color: '#2BA640' },
  { value: 'summary', label: 'Summary', icon: '📋', color: '#45B7D1' },
  { value: 'code_snippet', label: 'Code', icon: '💻', color: '#96CEB4' },
];

const COLORS = ['#3EA6FF', '#F7B955', '#7C4DFF', '#E8453C', '#2BA640', '#45B7D1', '#96CEB4', '#FF6B6B'];

export default function NoteEditor({ 
  initialData, 
  currentTime, 
  videoDuration,
  onSave, 
  onCancel,
  isSubmitting = false,
  className = '' 
}) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [type, setType] = useState(initialData?.type || 'general');
  const [color, setColor] = useState(initialData?.color_hex || '#3EA6FF');
  const [importance, setImportance] = useState(initialData?.importance_rating || null);
  const [timestampSeconds, setTimestampSeconds] = useState(
    initialData?.timestamp_seconds ?? (currentTime ? Math.floor(currentTime) : null)
  );
  const [tags, setTags] = useState(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState({});
  
  const contentRef = useRef(null);

  useEffect(() => {
    contentRef.current?.focus();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!content.trim()) newErrors.content = 'Note content is required';
    if (title.length > 200) newErrors.title = 'Title must be less than 200 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      title: title.trim() || null,
      content: content.trim(),
      type,
      color,
      importance,
      timestampSeconds: type === 'timestamp' ? timestampSeconds : null,
      tags,
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => setTags(tags.filter(t => t !== tag));

  const formatTimestamp = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* Note Type Selection */}
      <div className="flex flex-wrap gap-1.5">
        {NOTE_TYPES.map((nt) => (
          <button
            key={nt.value}
            type="button"
            onClick={() => setType(nt.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-medium
                       transition-all duration-200 border
              ${type === nt.value 
                ? 'border-current shadow-sm' 
                : 'border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default'
              }`}
            style={{ 
              color: type === nt.value ? nt.color : undefined,
              borderColor: type === nt.value ? nt.color : undefined,
              backgroundColor: type === nt.value ? `${nt.color}10` : 'transparent',
            }}
          >
            <span>{nt.icon}</span>
            <span>{nt.label}</span>
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title (optional)"
        className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                 text-body-base text-text-primary placeholder:text-text-tertiary
                 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                 transition-colors"
        maxLength={200}
      />
      {errors.title && <p className="text-body-xs text-error">{errors.title}</p>}

      {/* Content */}
      <div className="relative">
        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          rows={6}
          className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                   text-body-base text-text-primary placeholder:text-text-tertiary
                   focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                   resize-none transition-colors font-mono text-code-base"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="absolute bottom-2 right-2 text-caption text-text-tertiary">
          {content.length} chars • Ctrl+Enter to save
        </div>
      </div>
      {errors.content && <p className="text-body-xs text-error">{errors.content}</p>}

      {/* Timestamp (for timestamp type) */}
      <AnimatePresence>
        {type === 'timestamp' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg"
          >
            <svg className="w-5 h-5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-text-secondary">Timestamp:</span>
              <input
                type="number"
                value={timestampSeconds ?? ''}
                onChange={(e) => setTimestampSeconds(parseInt(e.target.value) || 0)}
                min={0}
                max={videoDuration || 86400}
                className="w-20 px-2 py-1 bg-surface-raised border border-border-subtle rounded
                         text-body-sm text-text-primary text-center font-mono"
              />
              <span className="text-body-sm text-accent-blue font-mono">
                {formatTimestamp(timestampSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setTimestampSeconds(Math.floor(currentTime || 0))}
                className="px-2 py-1 text-caption bg-accent-blue/10 text-accent-blue rounded
                         hover:bg-accent-blue/20 transition-colors"
              >
                Set Current
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Options Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Importance Rating */}
        <div className="flex items-center gap-1">
          <span className="text-caption text-text-tertiary mr-1">Importance:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setImportance(importance === star ? null : star)}
              className={`text-lg transition-colors ${
                importance && star <= importance ? 'text-yellow-400' : 'text-text-tertiary'
              }`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full transition-all ${
                color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addTag(); }
            }}
            placeholder="Add tag..."
            className="flex-1 px-3 py-1.5 bg-surface-overlay border border-border-subtle rounded-lg
                     text-body-sm text-text-primary placeholder:text-text-tertiary
                     focus:outline-none focus:border-accent-blue text-sm"
          />
          <Button type="button" onClick={addTag} variant="secondary" size="sm">Add</Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 
                                        text-accent-blue text-caption rounded-full">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="hover:text-error">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
        <Button type="button" onClick={onCancel} variant="ghost" disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {initialData ? 'Update Note' : 'Save Note'}
        </Button>
      </div>
    </form>
  );
}