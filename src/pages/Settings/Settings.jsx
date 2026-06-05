import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'playback', label: 'Playback', icon: '▶️' },
  { id: 'focus', label: 'Focus Mode', icon: '🎯' },
  { id: 'learning', label: 'Learning', icon: '📚' },
  { id: 'data', label: 'Data', icon: '💾' },
  { id: 'account', label: 'Account', icon: '👤' },
];

export default function Settings() {
  useDocumentTitle('Settings - FocusedTube');
  
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, exportData, importData, deleteAccount, isSaving, isExporting, isDeleting } = useSettings();
  const { theme, setTheme } = useTheme();
  
  const [activeSection, setActiveSection] = useState('appearance');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  // Local form state
  const [form, setForm] = useState({
    font_size: 'medium',
    reduced_motion: false,
    high_contrast: false,
    default_playback_speed: 1.0,
    autoplay: false,
    show_captions: true,
    focus_mode_enabled: false,
    daily_goal_minutes: 30,
  });

  // Sync form with settings
  useState(() => {
    if (settings) {
      setForm(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  };

  const handleExport = () => exportData();

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setShowImportConfirm(true);
    }
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      importData(data);
      setShowImportConfirm(false);
      setImportFile(null);
    } catch (error) {
      toast.error('Invalid import file');
    }
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-display-md font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-body-lg text-text-secondary">Customize your FocusedTube experience</p>
        </motion.div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <nav className="w-56 flex-shrink-0 hidden md:block">
            <div className="sticky top-24 space-y-1">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-body-sm font-medium
                           transition-colors text-left
                    ${activeSection === section.id 
                      ? 'bg-accent-blue/10 text-accent-blue' 
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                >
                  <span>{section.icon}</span>
                  <span>{section.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile Section Selector */}
          <div className="md:hidden w-full mb-6">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-raised border border-border-subtle rounded-xl
                       text-body-base text-text-primary focus:outline-none focus:border-accent-blue"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
              ))}
            </select>
          </div>

          {/* Settings Content */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
            >
              {/* Appearance Section */}
              {activeSection === 'appearance' && (
                <SettingsSection title="Appearance" icon="🎨">
                  <SettingRow label="Theme" description="Choose your preferred color theme">
                    <div className="flex gap-2">
                      {[
                        { value: 'dark', label: 'Dark', icon: '🌙' },
                        { value: 'light', label: 'Light', icon: '☀️' },
                        { value: 'system', label: 'System', icon: '💻' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-medium
                                   transition-colors border
                            ${theme === opt.value 
                              ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' 
                              : 'border-border-subtle text-text-secondary hover:border-border-default'
                            }`}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <SettingRow label="Font Size" description="Adjust text size for better readability">
                    <div className="flex gap-2">
                      {['small', 'medium', 'large'].map((size) => (
                        <button
                          key={size}
                          onClick={() => handleChange('font_size', size)}
                          className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-colors border
                            ${form.font_size === size 
                              ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' 
                              : 'border-border-subtle text-text-secondary hover:border-border-default'
                            }`}
                        >
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </button>
                      ))}
                    </div>
                  </SettingRow>

                  <ToggleRow
                    label="Reduced Motion"
                    description="Minimize animations throughout the app"
                    checked={form.reduced_motion}
                    onChange={(v) => handleChange('reduced_motion', v)}
                  />

                  <ToggleRow
                    label="High Contrast"
                    description="Increase contrast for better visibility"
                    checked={form.high_contrast}
                    onChange={(v) => handleChange('high_contrast', v)}
                  />
                </SettingsSection>
              )}

              {/* Playback Section */}
              {activeSection === 'playback' && (
                <SettingsSection title="Playback" icon="▶️">
                  <SettingRow label="Default Playback Speed" description="Set your preferred video speed">
                    <select
                      value={form.default_playback_speed}
                      onChange={(e) => handleChange('default_playback_speed', parseFloat(e.target.value))}
                      className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                               text-body-sm text-text-primary focus:outline-none focus:border-accent-blue"
                    >
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                        <option key={speed} value={speed}>{speed}x</option>
                      ))}
                    </select>
                  </SettingRow>

                  <ToggleRow
                    label="Autoplay"
                    description="Automatically start playing videos"
                    checked={form.autoplay}
                    onChange={(v) => handleChange('autoplay', v)}
                  />

                  <ToggleRow
                    label="Show Captions"
                    description="Display captions when available"
                    checked={form.show_captions}
                    onChange={(v) => handleChange('show_captions', v)}
                  />
                </SettingsSection>
              )}

              {/* Focus Mode Section */}
              {activeSection === 'focus' && (
                <SettingsSection title="Focus Mode" icon="🎯">
                  <ToggleRow
                    label="Enable Focus Mode by Default"
                    description="Start videos in distraction-free mode"
                    checked={form.focus_mode_enabled}
                    onChange={(v) => handleChange('focus_mode_enabled', v)}
                  />
                  <p className="text-body-sm text-text-tertiary px-6 pb-4">
                    Focus mode hides comments, suggestions, likes, and view counts to help you concentrate on learning.
                  </p>
                </SettingsSection>
              )}

              {/* Learning Section */}
              {activeSection === 'learning' && (
                <SettingsSection title="Learning Goals" icon="📚">
                  <SettingRow label="Daily Goal" description="Minutes of focused learning per day">
                    <input
                      type="number"
                      value={form.daily_goal_minutes}
                      onChange={(e) => handleChange('daily_goal_minutes', Math.max(1, Math.min(480, parseInt(e.target.value) || 30)))}
                      min={5}
                      max={480}
                      step={5}
                      className="w-24 px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                               text-body-sm text-text-primary text-center focus:outline-none focus:border-accent-blue"
                    />
                    <span className="ml-2 text-body-sm text-text-tertiary">minutes</span>
                  </SettingRow>
                </SettingsSection>
              )}

              {/* Data Section */}
              {activeSection === 'data' && (
                <SettingsSection title="Data Management" icon="💾">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body-base font-medium text-text-primary">Export Data</h3>
                        <p className="text-body-sm text-text-tertiary">Download all your data as JSON</p>
                      </div>
                      <Button onClick={handleExport} variant="secondary" loading={isExporting}>
                        Export
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body-base font-medium text-text-primary">Import Data</h3>
                        <p className="text-body-sm text-text-tertiary">Restore from a previous export</p>
                      </div>
                      <Button onClick={handleImportClick} variant="secondary">
                        Import
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </div>
                  </div>
                </SettingsSection>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <SettingsSection title="Account" icon="👤">
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body-base font-medium text-text-primary">Email</h3>
                        <p className="text-body-sm text-text-tertiary">{user?.email}</p>
                      </div>
                    </div>

                    <div className="border-t border-border-subtle pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-body-base font-medium text-error">Delete Account</h3>
                          <p className="text-body-sm text-text-tertiary">
                            Permanently delete your account and all data
                          </p>
                        </div>
                        <Button
                          onClick={() => setShowDeleteConfirm(true)}
                          variant="danger"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </SettingsSection>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onConfirm={() => { deleteAccount(); setShowDeleteConfirm(false); }}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Account"
        message="Are you absolutely sure? This will permanently delete your account and all associated data including videos, notes, bookmarks, and progress. This action cannot be undone."
        confirmLabel="Delete Account"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Import Confirmation */}
      <ConfirmDialog
        isOpen={showImportConfirm}
        onConfirm={handleImportConfirm}
        onCancel={() => { setShowImportConfirm(false); setImportFile(null); }}
        title="Import Data"
        message={`This will import data from "${importFile?.name}". Existing data may be overwritten. Are you sure?`}
        confirmLabel="Import"
        variant="primary"
      />
    </div>
  );
}

// Sub-components
function SettingsSection({ title, icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border-subtle">
        <span className="text-xl">{icon}</span>
        <h2 className="text-heading-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="divide-y divide-border-subtle">{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6">
      <div className="flex-1">
        <h3 className="text-body-base font-medium text-text-primary">{label}</h3>
        {description && <p className="text-body-sm text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between p-6">
      <div className="flex-1">
        <h3 className="text-body-base font-medium text-text-primary">{label}</h3>
        {description && <p className="text-body-sm text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors duration-200
          ${checked ? 'bg-accent-blue' : 'bg-surface-hover'}`}
      >
        <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200
          ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}