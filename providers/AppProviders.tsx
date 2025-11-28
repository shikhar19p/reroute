import React, { ReactNode } from 'react';
import { AuthProvider } from '../authContext';
import { ThemeProvider } from '../context/ThemeContext';
import { DialogProvider } from '../components/CustomDialog';
import { ToastProvider } from '../components/Toast';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Core Providers - Always loaded for all users
 * These are lightweight and essential for the app to function
 */
export function CoreProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <DialogProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </DialogProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/**
 * User-specific Providers - Only loaded for customer role
 * Lazy loaded to improve initial app performance
 */
export function UserProviders({ children }: { children: ReactNode }) {
  // Lazy load heavy providers
  const WishlistProvider = React.lazy(() =>
    import('../context/WishlistContext').then(module => ({
      default: module.WishlistProvider
    }))
  );

  const GlobalDataProvider = React.lazy(() =>
    import('../GlobalDataContext').then(module => ({
      default: module.GlobalDataProvider
    }))
  );

  return (
    <React.Suspense fallback={null}>
      <GlobalDataProvider>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </GlobalDataProvider>
    </React.Suspense>
  );
}

/**
 * Owner-specific Providers - Only loaded for owner role
 * Separate from user providers to reduce bundle size
 */
export function OwnerProviders({ children }: { children: ReactNode }) {
  const FarmRegistrationProvider = React.lazy(() =>
    import('../context/FarmRegistrationContext').then(module => ({
      default: module.FarmRegistrationProvider
    }))
  );

  return (
    <React.Suspense fallback={null}>
      <FarmRegistrationProvider>
        {children}
      </FarmRegistrationProvider>
    </React.Suspense>
  );
}
