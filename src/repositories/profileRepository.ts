
import { supabase } from '../lib/supabase';
import { User } from '../types';

export const ProfileRepository = {
  
  // Update Public Profile Data
  updateProfile: async (userId: string, data: Partial<User>) => {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (data.name) payload.name = data.name;
    if (data.phone) payload.phone = data.phone;
    if (data.avatar) payload.avatar_url = data.avatar;

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) throw new Error(error.message);
  },

  // Auth: Update Email & Password
  updateAuthUser: async (attributes: { email?: string; password?: string }) => {
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) throw new Error(error.message);
    return data;
  },

  // Upload Avatar specifically (No Watermark)
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 1. Upload
    const { error: uploadError } = await supabase.storage
      .from('proofs') // Using existing bucket, usually would be 'avatars'
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw new Error(uploadError.message);

    // 2. Get Public URL
    const { data } = supabase.storage.from('proofs').getPublicUrl(filePath);
    return data.publicUrl;
  },

  // Security: Reset Device Lock
  resetDeviceLock: async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ device_id: null })
      .eq('id', userId);
    
    if (error) throw new Error(error.message);
  },

  // Audit Log
  logSecurityAction: async (actorId: string, action: string, details: string) => {
    await supabase.from('audit_logs').insert({
      actor_id: actorId,
      action: action,
      details: details,
      device_info: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
  }
};
