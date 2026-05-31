"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type NavigationContextValue = {
  isNavigating: boolean;
  startNavigation: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!isNavigating) return;
    const timeout = window.setTimeout(() => setIsNavigating(false), 10_000);
    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  return (
    <NavigationContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    return {
      isNavigating: false,
      startNavigation: () => {},
    };
  }
  return ctx;
}
