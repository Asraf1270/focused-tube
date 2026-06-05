import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration } from '@/lib/utils/formatters';
import Button from '@/components/ui/Button';

export default function NotesPanel({ 
  notes = [], 
  isLoading, 
  onAdd, 
  onUpdate, 
  onDelete,
  videoDuration,
  currentTime,
  className = '' 
}) {
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  // Focus input when panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus edit input when editing
  useEffect(() => {
    if (editingNote) {
      editInputRef.current?.focus();
    }
  }, [editingNote]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    await onAdd({
      content: newNote.trim(),
      type: noteType,
      timestamp_seconds: noteType === 'timestamp' ? Math.floor(currentTime) : null,
    });

    setNewNote('');
    setNoteType('general');
    inputRef.current?.focus();
  };

  const handleUpdateNote = async (noteId) => {
    if (!editContent.trim()) return;

    await onUpdate(noteId, { content: editContent.trim() });
    setEditingNote(null);
    setEditContent('');
  };

  const handleStartEdit = (note) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  const handleSeekTo = (timestamp) => {
    // This will be handled by the parent component
    if (timestamp && window.player) {
      window.player.seekTo(timestamp);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-surface-hover rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-200px)] ${className}`}>
      {/* Add Note Form */}
      <div className="p-4 border-b border-border-subtle">
        <form onSubmit={handleAddNote}>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setNoteType('general')}
              className={`px-3 py-1 rounded-full text-caption font-medium transition-colors
                ${noteType === 'general' 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-surface-hover text-text-secondary'
                }`}
            >
              Note
            </button>
            <button
              type="button"
              onClick={() => setNoteType('timestamp')}
              className={`px-3 py-1 rounded-full text-caption font-medium transition-colors
                ${noteType === 'timestamp' 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-surface-hover text-text-secondary'
                }`}
            >
              Timestamp ({formatDuration(currentTime)})
            </button>
          </div>
          
          <div className="relative">
            <textarea
              ref={inputRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write a note..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                       text-body-sm text-text-primary placeholder:text-text-tertiary
                       focus:outline-none focus:border-accent-blue resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAddNote(e);
                }
              }}
            />
            <div className="absolute bottom-2 right-2 text-caption text-text-tertiary">
              {newNote.length}/500
            </div>
          </div>
          
          <div className="flex justify-end mt-2">
            <Button type="submit" variant="primary" size="sm" disabled={!newNote.trim()}>
              Add Note
            </Button>
          </div>
        </form>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <svg className="w-12 h-12 text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <p className="text-body-sm text-text-tertiary">
              No notes yet. Start capturing key insights!
            </p>
            <p className="text-caption text-text-tertiary mt-1">
              Press <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">Ctrl+Enter</kbd> to save
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 border-b border-border-subtle hover:bg-surface-hover/50 transition-colors"
              >
                {editingNote === note.id ? (
                  // Edit Mode
                  <div>
                    <textarea
                      ref={editInputRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                               text-body-sm text-text-primary focus:outline-none focus:border-accent-blue resize-none mb-2"
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleUpdateNote(note.id)} variant="primary" size="sm">
                        Save
                      </Button>
                      <Button onClick={handleCancelEdit} variant="ghost" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    {/* Timestamp Badge */}
                    {note.timestamp_seconds !== null && (
                      <button
                        onClick={() => handleSeekTo(note.timestamp_seconds)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 text-accent-blue 
                                 text-caption font-medium rounded-full mb-2 hover:bg-accent-blue/20 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        {formatDuration(note.timestamp_seconds)}
                      </button>
                    )}
                    
                    {/* Note Content */}
                    <p className="text-body-sm text-text-secondary whitespace-pre-wrap mb-2">
                      {note.content}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <span className="text-caption text-text-tertiary">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleStartEdit(note)}
                        className="text-caption text-accent-blue hover:text-accent-blue-hover transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(note.id)}
                        className="text-caption text-error hover:text-error/80 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}