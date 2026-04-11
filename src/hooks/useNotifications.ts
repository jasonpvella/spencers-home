import { useEffect, useState } from 'react';
import { useCurrentUser } from './useAuth';
import { subscribeToNotifications } from '@/services/notifications';
import type { Notification } from '@/types';

export function useNotifications(): Notification[] {
  const user = useCurrentUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.id || !user.stateId) return;
    const unsub = subscribeToNotifications(user.stateId, user.id, setNotifications);
    return unsub;
  }, [user?.id, user?.stateId, user?.role]);

  return notifications;
}
