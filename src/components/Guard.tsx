
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface GuardProps {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Guard: React.FC<GuardProps> = ({ roles, children, fallback = null }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
