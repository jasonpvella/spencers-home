import { useState, useEffect } from 'react';
import { subscribeToInquiries, subscribeToPendingCount } from '@/services/inquiries';
import type { Inquiry, UserRole } from '@/types';

export function useInquiries(stateId: string, role: UserRole | '', userId: string) {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateId || !role || !userId) return;
    setLoading(true);
    setError(null);

    const unsub = subscribeToInquiries(
      stateId,
      role as UserRole,
      userId,
      (data) => { setInquiries(data); setLoading(false); },
      (err) => { setError(err.message); setLoading(false); }
    );

    return unsub;
  }, [stateId, role, userId]);

  return { inquiries, loading, error };
}

export function usePendingInquiryCount(stateId: string, role: UserRole | '', userId: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!stateId || !role || !userId) return;
    const unsub = subscribeToPendingCount(stateId, role as UserRole, userId, setCount);
    return unsub;
  }, [stateId, role, userId]);

  return count;
}
