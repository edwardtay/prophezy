/**
 * Privy Account Abstraction Integration
 * Enables gasless transactions and social login for prediction markets
 */

export const privyConfig = {
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
  config: {
    // Appearance - updated to light theme to match app design
    appearance: {
      theme: 'light' as const,
      accentColor: '#4C6FFF' as const,
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

