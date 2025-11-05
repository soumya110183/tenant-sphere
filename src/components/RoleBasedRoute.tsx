import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ReactNode } from 'react';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: Array<'superadmin' | 'tenant' | 'staff'>;
}

export const RoleBasedRoute = ({ children, allowedRoles }: RoleBasedRouteProps) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
    