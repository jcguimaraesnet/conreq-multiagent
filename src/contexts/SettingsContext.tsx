'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UserSettings {
  require_brief_description: boolean;
  require_evaluation: boolean;
  batch_mode: boolean;
  quantity_req_batch: number;
  spec_attempts: number;
  model: string;
  model_judge: string;
}

interface SettingsContextType {
  settings: UserSettings;
  hasSavedSettings: boolean;
  isLoading: boolean;
  error: string | null;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: UserSettings = {
  require_brief_description: true,
  require_evaluation: true,
  batch_mode: true,
  quantity_req_batch: 5,
  spec_attempts: 3,
  model: 'gemini',
  model_judge: 'gemini',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Module-level state to persist between navigations
let cachedSettings: UserSettings | null = null;
let cachedHasSaved: boolean = false;
let cachedUserId: string | null = null;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Check if we have cached settings for this user
  const hasCachedSettings = user?.id && user.id === cachedUserId && cachedSettings !== null;

  const [settings, setSettings] = useState<UserSettings>(
    hasCachedSettings ? cachedSettings! : defaultSettings
  );
  const [hasSavedSettings, setHasSavedSettings] = useState(hasCachedSettings ? cachedHasSaved : false);
  // Only show loading if we don't have cached settings or auth is still loading
  const [isLoading, setIsLoading] = useState(isAuthLoading || !hasCachedSettings);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already fetched for this user
  const fetchedForUser = useRef<string | null>(
    hasCachedSettings ? user?.id ?? null : null
  );

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }

    if (!user?.id) {
      setSettings(defaultSettings);
      setHasSavedSettings(false);
      cachedSettings = null;
      cachedHasSaved = false;
      cachedUserId = null;
      fetchedForUser.current = null;
      setIsLoading(false);
      return;
    }

    // Skip if already fetched for this user (unless forcing refresh)
    if (!forceRefresh && fetchedForUser.current === user.id) {
      setIsLoading(false);
      return;
    }

    // Only set loading true if we don't have cached data
    if (!cachedSettings || cachedUserId !== user.id) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();

      const isSaved = data.is_saved === true;
      const loadedSettings: UserSettings = {
        require_brief_description: data.require_brief_description,
        require_evaluation: data.require_evaluation,
        batch_mode: data.batch_mode,
        quantity_req_batch: data.quantity_req_batch,
        spec_attempts: data.spec_attempts,
        model: data.model,
        model_judge: data.model_judge,
      };

      // Update module-level cache
      cachedSettings = loadedSettings;
      cachedHasSaved = isSaved;
      cachedUserId = user.id;
      fetchedForUser.current = user.id;

      setSettings(loadedSettings);
      setHasSavedSettings(isSaved);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      setSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, isAuthLoading]);

  // Fetch settings when user changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings to backend
  const saveSettings = useCallback(async (newSettings: UserSettings) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.id}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const data = await response.json();

      const persistedSettings: UserSettings = {
        require_brief_description: data.require_brief_description,
        require_evaluation: data.require_evaluation,
        batch_mode: data.batch_mode,
        quantity_req_batch: data.quantity_req_batch,
        spec_attempts: data.spec_attempts,
        model: data.model,
        model_judge: data.model_judge,
      };

      // Update cache and state from source of truth
      cachedSettings = persistedSettings;
      cachedHasSaved = true;
      cachedUserId = user.id;
      fetchedForUser.current = user.id;
      setSettings(persistedSettings);
      setHasSavedSettings(true);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  }, [user?.id]);

  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    cachedSettings = newSettings;
    saveSettings(newSettings);
  }, [settings, saveSettings]);

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    const mergedSettings = { ...settings, ...newSettings };
    setSettings(mergedSettings);
    cachedSettings = mergedSettings;
    saveSettings(mergedSettings);
  }, [settings, saveSettings]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings(true);
  }, [fetchSettings]);

  const value: SettingsContextType = {
    settings,
    hasSavedSettings,
    isLoading,
    error,
    updateSetting,
    updateSettings,
    refreshSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
