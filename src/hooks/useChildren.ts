import { useState, useEffect, useCallback } from 'react';
import {
  listChildren,
  listPublishedChildren,
  getChild,
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
    setLoading(true);
    listPublishedChildren(stateId)
      .then(setChildren)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [stateId]);

  return { children, loading, error };
}

export function useAllChildren(stateId: string) {
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    listChildren(stateId)
      .then(setChildren)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [stateId]);

  useEffect(() => { reload(); }, [reload]);

  return { children, loading, error, reload };
}

export function useChild(stateId: string, childId: string) {
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!stateId || !childId) return;
    setLoading(true);
    getChild(stateId, childId)
      .then(setChild)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [stateId, childId]);

  useEffect(() => { reload(); }, [reload]);

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
