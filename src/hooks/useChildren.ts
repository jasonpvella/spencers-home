import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToChildren,
  subscribeToOwnedChildren,
  subscribeToPublishedChildren,
  subscribeToChild,
  createChild,
  updateChild,
  publishProfile,
} from '@/services/children';
import type { ChildProfile } from '@/types';

export function usePublishedChildren(stateId: string) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateId) return;
    setLoading(true);
    const unsub = subscribeToPublishedChildren(
      stateId,
      (data) => { setChildren(data); setLoading(false); },
      (e) => { setError(e.message); setLoading(false); }
    );
    return unsub;
  }, [stateId]);

  return { children, loading, error };
}

// ownedByUid: when provided, only returns profiles owned by that user (own mode for caseworkers).
// When omitted, returns all profiles in the state (supervisor+ or pool mode).
export function useAllChildren(stateId: string, ownedByUid?: string) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateId) return;
    setLoading(true);
    const unsub = ownedByUid
      ? subscribeToOwnedChildren(
          stateId,
          ownedByUid,
          (data) => { setChildren(data); setLoading(false); },
          (e) => { setError(e.message); setLoading(false); }
        )
      : subscribeToChildren(
          stateId,
          (data) => { setChildren(data); setLoading(false); },
          (e) => { setError(e.message); setLoading(false); }
        );
    return unsub;
  }, [stateId, ownedByUid]);

  return { children, loading, error };
}

export function useChild(stateId: string, childId: string) {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stateId || !childId) return;
    setLoading(true);
    const unsub = subscribeToChild(
      stateId,
      childId,
      (data) => { setChild(data); setLoading(false); },
      (e) => { setError(e.message); setLoading(false); }
    );
    return unsub;
  }, [stateId, childId]);

  // no-op: onSnapshot keeps data live — callers that invoke reload() still work
  const reload = useCallback(() => {}, []);

  return { child, loading, error, reload };
}

export function useChildActions(stateId: string, userId: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async (data: Parameters<typeof createChild>[1]) => {
      setSaving(true);
      setError(null);
      try {
        return await createChild(stateId, data, userId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to save';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [stateId, userId]
  );

  const update = useCallback(
    async (childId: string, data: Parameters<typeof updateChild>[2]) => {
      setSaving(true);
      setError(null);
      try {
        await updateChild(stateId, childId, data, userId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [stateId, userId]
  );

  const publish = useCallback(
    async (childId: string) => {
      setSaving(true);
      setError(null);
      try {
        await publishProfile(childId, stateId, userId);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to publish';
        setError(msg);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [stateId, userId]
  );

  return { create, update, publish, saving, error };
}
