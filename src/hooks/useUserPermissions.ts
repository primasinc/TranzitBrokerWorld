import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPermissions, UserPermissions } from '../utils/userPermissions';

export const useUserPermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user?.uid) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const userPermissions = await getUserPermissions(user.uid);
        setPermissions(userPermissions);
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError('Failed to load user permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.uid]);

  return {
    permissions,
    loading,
    error,
    isCompanyOwner: permissions?.isCompanyOwner ?? false,
    isDriver: permissions?.isDriver ?? false,
    canInviteDrivers: permissions?.canInviteDrivers ?? false,
    canModifyCompanySettings: permissions?.canModifyCompanySettings ?? false,
    canViewCompanySettings: permissions?.canViewCompanySettings ?? true,
    canManageLoads: permissions?.canManageLoads ?? true,
    canViewPayments: permissions?.canViewPayments ?? true,
  };
}; 