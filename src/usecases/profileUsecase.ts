
import { ProfileRepository } from '../repositories/profileRepository';
import { User } from '../types';

export const ProfileUsecase = {
  
  updateProfileInfo: async (user: User, name: string, phone: string, avatarFile?: File) => {
    let avatarUrl = user.avatar;

    // 1. Handle Avatar Upload if exists
    if (avatarFile) {
      if (avatarFile.size > 2 * 1024 * 1024) throw new Error("Ukuran foto maksimal 2MB");
      if (!avatarFile.type.startsWith('image/')) throw new Error("File harus berupa gambar");
      
      avatarUrl = await ProfileRepository.uploadAvatar(user.id, avatarFile);
    }

    // 2. Update DB
    await ProfileRepository.updateProfile(user.id, {
      name: name.trim(),
      phone: phone.trim(),
      avatar: avatarUrl
    });

    // 3. Log
    await ProfileRepository.logSecurityAction(user.id, 'UPDATE_PROFILE', 'User updated profile details');
    
    return { name, phone, avatar: avatarUrl };
  },

  changePassword: async (user: User, oldPass: string, newPass: string, confirmPass: string) => {
    // 1. Validation
    if (newPass !== confirmPass) throw new Error("Konfirmasi password tidak cocok.");
    if (newPass.length < 8) throw new Error("Password minimal 8 karakter.");
    if (!/\d/.test(newPass)) throw new Error("Password harus mengandung angka.");
    
    // Note: Old password check usually happens on server/auth provider side automatically 
    // or requires re-authentication flow. Supabase updateUser doesn't require old pass strictly 
    // if session is active, but for high security usually we re-auth.
    // For this implementation, we trust the active session.

    // 2. Execute
    await ProfileRepository.updateAuthUser({ password: newPass });

    // 3. Log
    await ProfileRepository.logSecurityAction(user.id, 'CHANGE_PASSWORD', 'User changed password');
  },

  changeEmail: async (user: User, newEmail: string) => {
    if (!newEmail.includes('@')) throw new Error("Email tidak valid.");
    
    await ProfileRepository.updateAuthUser({ email: newEmail });
    await ProfileRepository.logSecurityAction(user.id, 'CHANGE_EMAIL', `User requested email change to ${newEmail}`);
  },

  logoutAllDevices: async (user: User) => {
    await ProfileRepository.resetDeviceLock(user.id);
    await ProfileRepository.logSecurityAction(user.id, 'REVOKE_DEVICES', 'User logged out all devices');
  }
};
