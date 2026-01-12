
import { User, Event, AttendanceRecord, Role, AuditLog, PermissionRequest, Reward, PointLog, BrandingConfig, FeatureConfig, Agenda, Organization } from '../types';
import { generateId, signData } from './utils';
import { DB } from './db';
import { QueueService } from './queue';
import { ApiService } from './api'; // Import API Service
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const FEATURES_KEY = 'sakato_features';
const BRANDING_KEY = 'sakato_branding_config';
const ORG_KEY = 'sakato_current_org';

// In-Memory Cache (Populated from Supabase, not IndexedDB)
let MEM_CACHE: any = {
    users: [],
    events: [],
    attendance: [],
    logs: [],
    notifications: [],
    permissions: [],
    rewards: [],
    point_logs: [],
    agendas: [],
    organizations: []
};

const DEFAULT_BRANDING: BrandingConfig = {
    appName: 'SAKATO',
    slogan: 'Enterprise System',
    primaryColor: '#0F172A',
    secondaryColor: '#2563EB',
    logoUrl: '',
    showFooter: true,
    darkMode: false,
    borderRadius: '0.75rem',
    fontFamily: 'Inter'
};

const DEFAULT_FEATURES: FeatureConfig = {
    leaderboard: true,
    rewards: true,
    exportPDF: true,
    maintenanceMode: false,
    analytics: true,
    notifications: true
};

const DEFAULT_ORG: Organization = {
    id: 'default',
    name: 'Organisasi Utama',
    pinCode: '123456',
    settings: {
        slaTarget: 80,
        allowMultiDevice: false,
        strictMode: true
    }
};

export const StorageService = {
  DEFAULT_PASSWORD: 'sakato123',
  currentOrgId: localStorage.getItem(ORG_KEY) || 'default',

  init: async () => {
      try {
          console.log("Initializing Services...");
          
          // 1. Open Offline DB (Queue Only)
          await DB.open();
          
          // 2. Fetch Fresh Data from Supabase to Populate RAM Cache
          // This ensures synchronous getters (getUsersSync) still work for the UI
          // without relying on local IndexedDB for data storage.
          try {
              if (navigator.onLine) {
                  const [users, events, attendance] = await Promise.all([
                      ApiService.getUsers(),
                      ApiService.getEvents(),
                      ApiService.getAttendanceHistory()
                  ]);
                  
                  MEM_CACHE.users = users;
                  MEM_CACHE.events = events;
                  MEM_CACHE.attendance = attendance;
                  
                  // Mock org for now as it's not in API yet
                  MEM_CACHE.organizations = [DEFAULT_ORG]; 
                  
                  console.log(`[Storage] Synced ${users.length} users, ${events.length} events from Supabase.`);
              } else {
                  console.warn("[Storage] Offline mode. Data might be stale (RAM only).");
              }
          } catch (apiError) {
              console.error("[Storage] Failed to fetch initial data from Supabase:", apiError);
          }

          StorageService.applyBranding();
          
          // 3. Process Offline Queue
          QueueService.processQueue();
          
      } catch (e) {
          console.error("STORAGE INIT FAILED:", e);
      }
  },

  // REMOVED: ensureUserExists (No more hardcoded syncing)

  getOrgSettings: () => {
      const org = MEM_CACHE.organizations.find((o: Organization) => o.id === StorageService.currentOrgId);
      return org || DEFAULT_ORG;
  },

  // --- ENTITY FILTERING ---
  // Note: These now read from MEM_CACHE which is populated from Supabase on init.
  getUsers: async (includeDeleted = false): Promise<User[]> => {
      let users = MEM_CACHE.users; // No org filter on users in basic schema yet
      return includeDeleted ? users : users.filter((u: User) => !u.deleted);
  },
  getUsersSync: (includeDeleted = false): User[] => {
      let users = MEM_CACHE.users;
      return includeDeleted ? users : users.filter((u: User) => !u.deleted);
  },
  getEvents: (includeDeleted = false): Event[] => {
      let events = MEM_CACHE.events;
      return includeDeleted ? events : events.filter((e: Event) => !e.deleted);
  },
  getRewards: (includeDeleted = false): Reward[] => {
      return MEM_CACHE.rewards || [];
  },
  getAttendance: (): AttendanceRecord[] => MEM_CACHE.attendance || [],
  getAuditLogs: (): AuditLog[] => MEM_CACHE.logs || [],
  getPermissions: (): PermissionRequest[] => MEM_CACHE.permissions || [],
  getPointLogs: (): PointLog[] => MEM_CACHE.point_logs || [],
  getAgendas: (): Agenda[] => MEM_CACHE.agendas || [],

  // --- ACTIONS (HYBRID: Try API -> Fallback Queue) ---
  
  saveAttendance: async (record: AttendanceRecord) => {
      record.orgId = record.orgId || StorageService.currentOrgId;
      
      // Local Duplicate Check
      const exists = MEM_CACHE.attendance.find((r: AttendanceRecord) => r.userId === record.userId && r.eventId === record.eventId);
      if (exists) throw new Error("Absensi sudah dilakukan untuk event ini (Local Check).");

      const signedRecord = await signData(record);

      // Optimistic Update (RAM)
      MEM_CACHE.attendance.unshift(signedRecord);

      if (navigator.onLine) {
          try {
              // Try Direct Supabase RPC
              // Note: This duplicates ApiService logic slightly but ensures StorageService interface compliance
              await ApiService.submitAttendanceRPC(
                  record.eventId,
                  record.latitude || 0,
                  record.longitude || 0,
                  record.proofPhoto || '',
                  record.notes || '',
                  record.deviceInfo || 'unknown'
              );
              signedRecord.synced = true;
          } catch(e) {
              console.warn("Online upload failed, queuing...", e);
              signedRecord.synced = false;
              QueueService.addToQueue(signedRecord);
          }
      } else {
          console.log("Offline: Queuing attendance");
          signedRecord.synced = false;
          QueueService.addToQueue(signedRecord);
      }
  },

  // --- CRUD STUBS (Direct to API or Queue) ---
  saveUser: async (user: User, actor: User) => {
      // In a real app, this should call ApiService.updateUser
      // For now, updating local cache to reflect changes in UI immediately
      const idx = MEM_CACHE.users.findIndex((u: User) => u.id === user.id);
      if (idx >= 0) MEM_CACHE.users[idx] = user;
      else MEM_CACHE.users.push(user);
      
      // TODO: Implement ApiService.saveUser
  },

  saveEvent: async (event: Event, actor?: User) => {
      const idx = MEM_CACHE.events.findIndex((e: Event) => e.id === event.id);
      if (idx !== -1) MEM_CACHE.events[idx] = event;
      else MEM_CACHE.events.push(event);
      
      // TODO: Implement ApiService.saveEvent
  },

  // --- UTILS ---
  getDeviceFingerprint: async (): Promise<string> => {
      return navigator.userAgent + '::' + (window.screen.width + 'x' + window.screen.height);
  },

  checkDeviceLock: async (user: User): Promise<boolean> => {
      // Logic handled by AuthContext via Supabase
      return true; 
  },

  secureExport: async (data: any[], filename: string, pin: string, type: 'CSV' | 'PDF' = 'CSV') => {
      const org = StorageService.getOrgSettings();
      if (pin !== org.pinCode) throw new Error("PIN Admin Salah!");

      if (type === 'CSV') {
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, "SecureData");
          XLSX.writeFile(workbook, `${filename}.csv`);
      } else {
          const doc = new jsPDF();
          doc.setFontSize(10);
          doc.text(`Exported: ${new Date().toLocaleString()}`, 10, 10);
          (doc as any).autoTable({ head: [Object.keys(data[0] || {})], body: data.map(obj => Object.values(obj)), startY: 20 });
          doc.save(`${filename}.pdf`);
      }
  },

  // Boilerplate Placeholders to satisfy interface without IndexedDB logic
  deleteUser: async (userId: string, actor: User) => ApiService.deleteUser(userId, actor),
  logAudit: async (actor: any, action: string, details: string) => ApiService.logAudit(actor.id, action, details),
  updateUserPoints: async () => {}, // Points handled by DB triggers now
  
  isOnlineMode: () => navigator.onLine,
  getBranding: () => { const s = localStorage.getItem(BRANDING_KEY); return s ? {...DEFAULT_BRANDING, ...JSON.parse(s)} : DEFAULT_BRANDING; },
  saveBranding: (c: BrandingConfig) => { localStorage.setItem(BRANDING_KEY, JSON.stringify(c)); },
  applyBranding: () => { },
  getFeatures: () => { const f = localStorage.getItem(FEATURES_KEY); return f ? {...DEFAULT_FEATURES, ...JSON.parse(f)} : DEFAULT_FEATURES; },
  saveFeatures: (f: FeatureConfig) => localStorage.setItem(FEATURES_KEY, JSON.stringify(f)),
  
  saveReward: async (r: Reward, actor: User) => {},
  deleteReward: async (id: string, actor: User) => {},
  saveAgenda: async (a: Agenda, actor: User) => {},
  deleteAgenda: async (id: string, actor: User) => {},
  savePermission: async (req: PermissionRequest) => {},
  updatePermissionStatus: async (id: string, status: any, actorId: string) => {},
  checkDeviceBinding: async (userId: string) => true,
  backupDatabase: async (table?: string) => ({success: true, message: 'Not available in Cloud Mode'}),
  restorePartial: async (file: File, table: string, actor: User) => "Not available in Cloud Mode",
  claimReward: async (rewardId: string, userId: string) => {},
  deleteEvent: async (id: string, actor: User) => {},
  restoreItem: async (type: string, id: string, actor: User) => {},
  permanentDelete: async (type: string, id: string, actor: User) => {},
  updatePassword: async (id: string, pass: string, actor: User) => {},
  updateUserRole: async (id: string, role: string, actor: User) => {},
  bulkDeleteUsers: async (ids: string[], actor: User) => 0,
  bulkResetPasswords: async (ids: string[], actor: User) => 0,
  checkIntegrity: async () => ({success:true, report:[]}),
  saveLoginLog: (userId: string) => {},
  markNotificationRead: async (id: string) => {}
};
