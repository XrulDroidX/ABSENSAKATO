
import { supabase } from '../lib/supabase';
import { Event } from '../types';

export const EventRepository = {
  getActiveEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .neq('status', 'BATAL')
      .eq('status', 'BERLANGSUNG') // Optimized filter at DB level
      .order('date', { ascending: false });

    if (error) throw error;
    
    return data.map((e: any) => ({
      ...e,
      startTime: e.start_time,
      endTime: e.end_time,
      locationName: e.location_name,
      radiusMeters: e.radius_meters,
      lateToleranceMinutes: e.late_tolerance_minutes || 15,
      maxCapacity: e.max_capacity,
      currentAttendees: e.current_attendees
    }));
  },

  incrementAttendee: async (eventId: string) => {
    const { error } = await supabase.rpc('increment_attendees', { row_id: eventId });
    if (error) console.error("Failed to increment attendee count", error);
  }
};
