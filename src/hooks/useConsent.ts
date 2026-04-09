import { useState, useEffect } from 'react';
import { listExpiringConsents } from '@/services/consent';
import type { ConsentRecord } from '@/types';

export function useExpiringConsents(stateId: string, withinDays = 30) {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stateId) { setLoading(false); return; }
    setLoading(true);
    listExpiringConsents(stateId, withinDays)
      .then(setConsents)
      .catch(() => setConsents([]))
      .finally(() => setLoading(false));
  }, [stateId, withinDays]);

  return { consents, loading };
}
