import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotes } from '@/hooks/useNotes';
import NoteEditor from '@/components/NoteEditor/NoteEditor';
import NoteCard from '@/components/NoteCard/NoteCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

const TABS = [
  { value: 'all', label: 'All', icon: '📝' },
  { value: 'timestamp', label: 'Timestamps', icon: '⏱️' },
  { value: 'key_concept', label: 'Key Concepts', icon: '💡' },
  { value: 'question', label: 'Questions', icon: '❓' },
  { value: 'action_item', label: 'Actions', icon: '✅' },
];

export default function NotesPanel({ videoId, currentTime, videoDuration, onSeekTo }) {
  const {
    notes, pinnedNotes, unpinnedNotes, isLoading, editingNoteId,
    activeTab, setActiveTab, addNote, updateNote, deleteNote,
    startEditing, stopEditing, isCreating,
  } = useNotes(videoId);

  const [showEditor, setShowEditor] = useState(false);
  const editingNote = notes.find(n => n.id === editingNoteId);

  const handleSaveNew = async (data) => {
    await addNote(data);
    setShowEditor(false);
  };

  const handleSaveEdit = async (data) => {
    await updateNote(editingNoteId, data);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Add Button */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-heading-sm font-semibold text-text-primary">Notes</h3>
          <Button
            onClick={() => setShowEditor(!showEditor)}
            variant={showEditor ? 'secondary' : 'primary'}
            size="sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={showEditor ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {showEditor ? 'Cancel' : 'Add Note'}
          </Button>
        </div>

        {/* New Note Editor */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <NoteEditor
                currentTime={currentTime}
                videoDuration={videoDuration}
                onSave={handleSaveNew}
                onCancel={() => setShowEditor(false)}
                isSubmitting={isCreating}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex-1 py-1.5 text-caption font-medium rounded-md transition-colors
                ${activeTab === tab.value 
                  ? 'bg-accent-blue text-white' 
                  : 'text-text-tertiary hover:bg-surface-hover'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-surface-hover rounded-lg animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">📝</span>}
            title="No notes yet"
            description="Capture key insights while watching. Notes with timestamps let you jump right back to important moments."
            action={
              <Button onClick={() => setShowEditor(true)} variant="primary" size="sm">
                Add First Note
              </Button>
            }
            className="h-full"
          />
        ) : (
          <div>
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <div className="border-b border-border-subtle bg-surface-overlay/50">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    isEditing={editingNoteId === note.id}
                    onEdit={startEditing}
                    onSave={handleSaveEdit}
                    onCancel={stopEditing}
                    onDelete={deleteNote}
                    onSeekTo={onSeekTo}
                  />
                ))}
              </div>
            )}

            {/* Unpinned Notes */}
            {unpinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                isEditing={editingNoteId === note.id}
                onEdit={startEditing}
                onSave={handleSaveEdit}
                onCancel={stopEditing}
                onDelete={deleteNote}
                onSeekTo={onSeekTo}
              />
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="p-3 border-t border-border-subtle text-center">
        <p className="text-caption text-text-tertiary">
          <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">Ctrl+Enter</kbd> to save • 
          Click timestamp to jump
        </p>
      </div>
    </div>
  );
}