/**
 * Privy Account Abstraction Integration
 * Enables gasless transactions and social login for prediction markets
 */

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    // Login methods - social login + wallet
    // Note: Google login requires Privy App ID and Google OAuth to be enabled in Privy dashboard
    loginMethods: ['email', 'wallet', 'google', 'twitter'],
    
    // Appearance - updated to light theme to match app design
    appearance: {
      theme: 'light' as const,
      accentColor: '#6366F1',
      logo: '/favicon.svg',
    },
    
    // Embedded wallets - creates wallets automatically for users without wallets
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    
    // Account Abstraction features
    mfa: {
      noPromptOnMfaRequired: false,
    },
  },
};

/**
 * Get Privy provider instance
 */
export function getPrivyProvider() {
  // Privy provider is initialized via PrivyProvider component
  return null;
}

/**
 * Check if user is authenticated via Privy
 */
export async function isPrivyAuthenticated(): Promise<boolean> {
  // This will be called from Privy hooks
  return false;
}

