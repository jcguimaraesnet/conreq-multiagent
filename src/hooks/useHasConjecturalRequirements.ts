'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api";

let cachedResult: boolean = false;
let cachedUserId: string | null = null;

export function useHasConjecturalRequirements() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [hasConjectural, setHasConjectural] = useState(
    user?.id && user.id === cachedUserId ? cachedResult : false,
  );
  const fetchedForUser = useRef<string | null>(
    user?.id && user.id === cachedUserId ? user.id : null,
  );

  useEffect(() => {
    if (isAuthLoading) return;

    if (!user?.id) {
      cachedResult = false;
      cachedUserId = null;
      fetchedForUser.current = null;
      setHasConjectural(false);
      return;
    }

    if (fetchedForUser.current === user.id) return;

    (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}${API_PREFIX}/conjectural-requirements/user/has-any`,
          {
            headers: { Authorization: `Bearer ${user.id}` },
          },
        );

        if (!response.ok) throw new Error('Failed to check conjectural requirements');

        const data = await response.json();
        const result = data.has_conjectural === true;

        cachedResult = result;
        cachedUserId = user.id;
        fetchedForUser.current = user.id;
        setHasConjectural(result);
      } catch (err) {
        console.error('Error checking conjectural requirements:', err);
      }
    })();
  }, [user?.id, isAuthLoading]);

  return hasConjectural;
}
