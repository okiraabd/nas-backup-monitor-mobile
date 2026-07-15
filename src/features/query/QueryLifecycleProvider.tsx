import { focusManager } from '@tanstack/react-query';
import { useIsFocused } from '@react-navigation/native';
import { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

const AppActiveContext = createContext(AppState.currentState === 'active');

export function QueryLifecycleProvider({ children }: PropsWithChildren) {
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      setIsAppActive(active);
      focusManager.setFocused(active);
    });

    return () => subscription.remove();
  }, []);

  return <AppActiveContext.Provider value={isAppActive}>{children}</AppActiveContext.Provider>;
}

export function useScreenPollingInterval(intervalMs: number) {
  const isAppActive = useContext(AppActiveContext);
  const isScreenFocused = useIsFocused();

  return isAppActive && isScreenFocused ? intervalMs : false;
}

export function useRefreshOnScreenFocus(refresh: () => void) {
  const isAppActive = useContext(AppActiveContext);
  const isScreenFocused = useIsFocused();
  const isActive = isAppActive && isScreenFocused;
  const wasActive = useRef(isActive);
  const refreshRef = useRef(refresh);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (isActive && !wasActive.current) {
      refreshRef.current();
    }
    wasActive.current = isActive;
  }, [isActive]);
}
