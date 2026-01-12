
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  PENGURUS = 'PENGURUS',
  ANGGOTA = 'ANGGOTA',
}

export enum AttendanceMode {
  QR = 'QR',
  GPS = 'GPS',
  HYBRID = 'HYBRID' // GPS + QR
}

export enum AgendaCategory {
  RAPAT = 'RAPAT',
  PELATIHAN = 'PELATIHAN',
  SOSIAL = 'SOSIAL',
  DARURAT = 'DARURAT',
  LAINNYA = 'LAINNYA'
}

// Base Interface for Soft Delete & Integrity & Multi-Tenancy
export interface BaseEntity {
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  _checksum?: string;
  _tainted?: boolean;
  orgId?: string; // Multi-Organization Isolation
}

export interface Organization extends BaseEntity {
    id: string;
    name: string;
    pinCode: string; // For Secure Export
    settings: {
        slaTarget: number; // e.g. 85%
        allowMultiDevice: boolean;
        strictMode: boolean;
    };
}

export interface User extends BaseEntity {
  id: string;
  nia?: string; 
  name: string;
  division: string;
  role: Role;
  password?: string;
  phone: string;
  email?: string;
  isActive: boolean;
  avatar?: string;
  joinDate?: string;
  trustScore?: number;
  totalPoints?: number;
  photoReference?: string;
  badges?: string[]; 
  
  // Security
  deviceId?: string;
  lastLogin?: string;
  
  preferences?: {
    notifications: boolean;
  };
  adminNotes?: { id: string, content: string, date: string, author: string }[];
}

export interface GeoLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    radius: number;
    type: 'INDOOR' | 'OUTDOOR';
}

export interface Event extends BaseEntity {
  id: string;
  name: string;
  date: string; 
  startTime: string;
  endTime: string;
  locationName: string; 
  locations?: GeoLocation[]; 
  latitude: number; 
  longitude: number; 
  radiusMeters: number; 
  mode: AttendanceMode;
  status: 'BERLANGSUNG' | 'SELESAI' | 'DITUNDA' | 'BATAL' | 'AKAN_DATANG' | 'PENUH';
  locked?: boolean; 
  resumeDeadline?: string;
  resumedAt?: string;
  lateToleranceMinutes?: number;
  
  // Capacity
  maxCapacity?: number;
  currentAttendees?: number;
}

export interface AttendanceRecord extends BaseEntity {
  id: string;
  userId: string;
  eventId: string;
  timestamp: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'PERMISSION' | 'ON_HOLD' | 'CANCELLED';
  latitude?: number;
  longitude?: number;
  trustScore: number; 
  trustBadges?: string[]; 
  deviceInfo?: string;
  notes?: string;
  proofPhoto?: string; 
  synced?: boolean; 
}

export interface PermissionRequest {
  id: string;
  userId: string;
  eventId: string;
  reasonType: 'SICK' | 'FAMILY' | 'DUTY' | 'OTHER';
  reasonDetail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
  orgId?: string;
}

export interface Notification {
  id: string;
  userId: string; 
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'INFO' | 'ALERT' | 'SUCCESS';
  orgId?: string;
}

export interface Reward extends BaseEntity {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  imageUrl?: string;
}

export interface PointLog {
  id: string;
  userId: string;
  eventId?: string;
  change: number; 
  reason: string; 
  timestamp: string;
  finalBalance: number;
  orgId?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetId?: string;
  details: string; 
  diff?: { field: string, old: any, new: any }[]; 
  ipAddress: string; 
  deviceInfo: string;
  orgId?: string;
}

export interface BrandingConfig {
  appName: string;
  slogan: string; 
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  showFooter: boolean;
  darkMode: boolean;
  borderRadius: string; 
  fontFamily: string;   
}

export interface Agenda {
    id: string;
    title: string;
    category: AgendaCategory;
    date: string;
    time: string;
    description: string;
    createdBy: string;
    createdAt: string;
    orgId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (id: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

export interface FeatureConfig {
    leaderboard: boolean;
    rewards: boolean;
    exportPDF: boolean;
    maintenanceMode: boolean;
    analytics: boolean;
    notifications: boolean;
}
