import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  wasOffline: boolean;
}

interface NetworkContextType extends NetworkState {
  checkOnline: () => boolean;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  wasOffline: false,
  checkOnline: () => true,
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    wasOffline: false,
  });
  const wentOfflineRef = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const setOnline = () =>
        setState(prev => ({
          isConnected: true,
          isInternetReachable: true,
          wasOffline: wentOfflineRef.current,
        }));
      const setOffline = () => {
        wentOfflineRef.current = true;
        setState({ isConnected: false, isInternetReachable: false, wasOffline: false });
      };
      window.addEventListener('online', setOnline);
      window.addEventListener('offline', setOffline);
      // Sync initial state
      if (!navigator.onLine) setOffline();
      return () => {
        window.removeEventListener('online', setOnline);
        window.removeEventListener('offline', setOffline);
      };
    }

    // Native
    const NetInfo = require('@react-native-community/netinfo').default;
    const unsubscribe = NetInfo.addEventListener((netState: any) => {
      const connected = netState.isConnected ?? true;
      const reachable = netState.isInternetReachable;
      const online = connected && reachable !== false;

      if (!online) {
        wentOfflineRef.current = true;
        setState({ isConnected: false, isInternetReachable: false, wasOffline: false });
      } else {
        setState({
          isConnected: true,
          isInternetReachable: reachable,
          wasOffline: wentOfflineRef.current,
        });
      }
    });

    // Fetch initial state
    NetInfo.fetch().then((netState: any) => {
      const connected = netState.isConnected ?? true;
      const reachable = netState.isInternetReachable;
      const online = connected && reachable !== false;
      if (!online) {
        wentOfflineRef.current = true;
        setState({ isConnected: false, isInternetReachable: false, wasOffline: false });
      }
    });

    return () => unsubscribe();
  }, []);

  // After "back online" is read, clear wasOffline flag
  useEffect(() => {
    if (state.isConnected && state.wasOffline) {
      wentOfflineRef.current = false;
      const t = setTimeout(() => {
        setState(prev => ({ ...prev, wasOffline: false }));
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [state.isConnected, state.wasOffline]);

  const checkOnline = () => state.isConnected;

  return (
    <NetworkContext.Provider value={{ ...state, checkOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}

export function useIsConnected() {
  return useContext(NetworkContext).isConnected;
}

/**
 * Returns a guard function. Call it before any write/mutation.
 * If offline, shows a toast and returns false. If online, returns true.
 *
 * Usage:
 *   const guard = useNetworkGuard();
 *   if (!guard()) return;
 *   await doSomeMutation();
 */
export function useNetworkGuard() {
  const { isConnected } = useContext(NetworkContext);
  return (showToast?: (msg: string) => void) => {
    if (!isConnected) {
      showToast?.('No internet connection. Please check your network and try again.');
      return false;
    }
    return true;
  };
}
