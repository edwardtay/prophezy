"use client";

import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { privyConfig } from "../lib/privy";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [isHttps, setIsHttps] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Allow HTTP on localhost for local development - NO REDIRECTS
    if (typeof window !== 'undefined') {
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      // Never redirect on localhost - allow HTTP
      // Only check HTTPS status, don't force redirect
      setIsHttps(window.location.protocol === 'https:' || isLocalhost);
    }
  }, []);

  // Only use Privy if app ID is configured AND we're on HTTPS
  const hasPrivyAppId = privyConfig.appId && privyConfig.appId.trim() !== '';
  const canUsePrivy = hasPrivyAppId && isHttps && mounted;
  
  if (canUsePrivy) {
    return (
      <PrivyProvider {...privyConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </QueryClientProvider>
      </PrivyProvider>
    );
  }
  
  // Fallback without Privy - app still works, just without AA features
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

