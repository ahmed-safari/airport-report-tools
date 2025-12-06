"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook for persisting state in localStorage with automatic save/load
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  onSave?: () => void
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // Track if this is the initial mount
  const [isInitialized, setIsInitialized] = useState(false);
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [key]);

  // Save to localStorage when value changes (but not on initial load)
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, storedValue, isInitialized, onSave]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      if (typeof value === "function") {
        return (value as (prev: T) => T)(prev);
      }
      return value;
    });
  }, []);

  return [storedValue, setValue, isLoading];
}

/**
 * Hook for simple localStorage access without reactive updates
 */
export function useLocalStorageSimple<T>(key: string, initialValue: T) {
  const load = useCallback((): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const save = useCallback(
    (value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    },
    [key]
  );

  const remove = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }, [key]);

  return { load, save, remove };
}

/**
 * Hook for tracking "settings saved" indicator with auto-dismiss
 */
export function useSettingsSavedIndicator(duration = 2000) {
  const [saved, setSaved] = useState(false);

  const showSaved = useCallback(() => {
    setSaved(true);
    const timer = setTimeout(() => setSaved(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return [saved, showSaved] as const;
}
