import { supabase } from '../client';

export const settingsService = {
  async getSettings() {
    const { data, error } = await supabase.rpc('get_user_settings');
    if (error) throw error;
    return data || {};
  },

  async updateSettings(settings) {
    const { data, error } = await supabase.rpc('update_user_settings', { p_settings: settings });
    if (error) throw error;
    return data;
  },

  async exportData() {
    const { data, error } = await supabase.rpc('export_user_data');
    if (error) throw error;
    return data;
  },

  async importData(jsonData) {
    const { data, error } = await supabase.rpc('import_user_data', { p_data: jsonData });
    if (error) throw error;
    return data;
  },

  async deleteAccount() {
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
  },
};