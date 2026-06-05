import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/lib/supabase/services/settingsService';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

export function useSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.getSettings,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => settingsService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved!');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const exportMutation = useMutation({
    mutationFn: settingsService.exportData,
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `focused-tube-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported!');
    },
    onError: () => toast.error('Failed to export data'),
  });

  const importMutation = useMutation({
    mutationFn: settingsService.importData,
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Data imported successfully!');
    },
    onError: () => toast.error('Failed to import data'),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: settingsService.deleteAccount,
    onSuccess: () => {
      toast.success('Account deleted');
      window.location.href = '/';
    },
    onError: () => toast.error('Failed to delete account'),
  });

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    exportData: exportMutation.mutate,
    importData: importMutation.mutate,
    deleteAccount: deleteAccountMutation.mutate,
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending,
    isDeleting: deleteAccountMutation.isPending,
    isSaving: updateMutation.isPending,
  };
}