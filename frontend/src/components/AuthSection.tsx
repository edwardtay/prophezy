"use client";

import { privyConfig } from "../lib/privy";
import { AuthSectionWithPrivy } from "./AuthSectionWithPrivy";

export function AuthSection() {
  const hasPrivyAppId = privyConfig.appId && privyConfig.appId.trim() !== '';
  
  // If Privy is not configured, show a simple message
  if (!hasPrivyAppId) {
    return (
      <span className="text-xs text-gray-500 px-3 py-1.5 bg-gray-50 rounded-lg">
        Auth disabled
      </span>
    );
  }
  
  // Privy is configured, render component that uses the hook
  return <AuthSectionWithPrivy />;
}

