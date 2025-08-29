"use client";

import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving to localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsedItem = JSON.parse(item);
          if (key === "chatSessions" && Array.isArray(parsedItem)) {
            const sessionsWithDates = parsedItem.map(
              (session: Record<string, unknown>) => ({
                ...session,
                createdAt: new Date(session.createdAt as string),
                updatedAt: new Date(session.updatedAt as string),
                messages: (session.messages as Record<string, unknown>[]).map(
                  (msg: Record<string, unknown>) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp as string),
                  })
                ),
              })
            ) as T;
            setStoredValue(sessionsWithDates);
          } else {
            setStoredValue(parsedItem);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}
