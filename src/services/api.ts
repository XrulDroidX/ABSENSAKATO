
import { supabase } from '../lib/supabase';
import { User, Event, AttendanceRecord, Role } from '../types';
import { generateId } from './utils';

export const ApiService = {
  
  // --- PROFILES & MEMBERS ---
  getProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    
    if (error) throw error;

    return data.map((p: any) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role as Role,
      division: p.division,
      nia: p.nia,
      phone: p.phone,
      totalPoints: p.total_points,
      trustScore: p.trust_score,
      isActive: p.is_active,
      avatar: p.avatar_url,
      deviceId: p.device_id,
      adminNotes: p.admin_notes || []
    }));
  },

  // ENTERPRISE: Member Management Actions
  resetUserPassword: async (targetUserId: string, newPass: string, actor: User) => {
    // Audit First
    await ApiService.logAudit(actor.id, 'RESET_PASSWORD', `Reset password for user ${targetUserId}`);
    // In real Supabase Auth, you use admin.auth.updateUserById, but here we update profile for simulated auth
    const { error } = await supabase
      .from('profiles')
      .update({ password: newPass }) // Note: In prod, use Supabase Auth API
      .eq('id', targetUserId);
    if (error) throw error;
  },

  resetUserDevice: async (targetUserId: string, actor: User) => {
    await ApiService.logAudit(actor.id, 'RESET_DEVICE', `Unbind device for user ${targetUserId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ device_id: null })
      .eq('id', targetUserId);
    if (error) throw error;
  },

  toggleUserStatus: async (targetUserId: string, isActive: boolean, actor: User) => {
    await ApiService.logAudit(actor.id, isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', `Set active status to ${isActive} for user ${targetUserId}`);
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', targetUserId);
    if (error) throw error;
  },

  deleteUser: async (targetUserId: string, actor: User) => {
    await ApiService.logAudit(actor.id, 'DELETE_USER', `Soft delete user ${targetUserId}`);
    // Soft Delete
    const { error } = await supabase
      .from('profiles')
      .update({ deleted: true, deleted_at: new Date().toISOString(), deleted_by: actor.id })
      .eq('id', targetUserId);
    if (error) throw error;
  },

  updateDeviceLock: async (userId: string, deviceId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ device_id: deviceId, last_seen: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
  },

  // --- EVENTS ---
  getEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data.map((e: any) => ({
      id: e.id,
      name: e.name,
      date: e.date,
      startTime: e.start_time,
      endTime: e.end_time,
      locationName: e.location_name,
      latitude: e.latitude,
      longitude: e.longitude,
      radiusMeters: e.radius_meters,
      mode: e.mode,
      status: e.status,
      maxCapacity: e.max_capacity,
      lateToleranceMinutes: e.late_tolerance_minutes
    }));
  },

  // --- ATTENDANCE ---
  getAttendanceHistory: async (userId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (userId) query = query.eq('user_id', userId);
    
    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) throw error;

    return data.map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      eventId: a.event_id,
      status: a.status,
      timestamp: a.timestamp,
      trustScore: a.trust_score_gained,
      proofPhoto: a.proof_photo,
      synced: true,
      latitude: a.latitude,
      longitude: a.longitude,
      notes: a.notes,
      metadata: a.metadata || {} 
    }));
  },

  submitAttendanceRPC: async (eventId: string, lat: number, lng: number, photo: string, notes: string, deviceId: string, metadata: any = {}) => {
    const { data, error } = await supabase.rpc('submit_attendance', {
      p_event_id: eventId,
      p_lat: lat,
      p_lng: lng,
      p_photo: photo,
      p_notes: notes,
      p_device_id: deviceId,
      p_metadata: metadata 
    });

    if (error) throw error;
    return data;
  },

  // --- LOGGING (FORENSICS) ---
  logAudit: async (actorId: string, action: string, details: string, metadata: any = {}) => {
    // Fire and forget mechanism safe
    try {
        await supabase.from('audit_logs').insert({
          action: action,
          actor_id: actorId,
          details: details,
          ip_address: 'CLIENT_IP', // Supabase will fill this usually via trigger or edge function
          device_info: navigator.userAgent,
          metadata: metadata
        });
    } catch (e) {
        console.warn("Audit Log Failed:", e);
    }
  },

  logUploadAudit: async (userId: string, filePath: string, fileHash: string, ip: string, device: string) => {
    await supabase.from('audit_logs').insert({
      action: "UPLOAD_PROOF",
      actor_id: userId,
      details: `Uploaded proof to ${filePath}`,
      target_id: filePath,
      ip_address: ip,
      device_info: device,
      metadata: { file_hash: fileHash }
    });
  }
};
