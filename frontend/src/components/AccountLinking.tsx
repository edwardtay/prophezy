"use client";

import { useState } from "react";
import { usePrivy } from '@privy-io/react-auth';

interface AccountLinkingProps {
  onClose: () => void;
}

export default function AccountLinking({ onClose }: AccountLinkingProps) {
  const { user, linkEmail, linkGoogle, linkTwitter, linkWallet, unlinkEmail, unlinkWallet, unlinkGoogle, unlinkTwitter, unlinkDiscord } = usePrivy();
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const linkedAccounts = user?.linkedAccounts || [];
  
  const getAccountType = (account: any) => {
    if (account.type === 'email') return 'email';
    if (account.type === 'google_oauth') return 'google';
    if (account.type === 'twitter_oauth') return 'twitter';
    if (account.type === 'discord_oauth') return 'discord';
    if (account.type === 'wallet') return 'wallet';
    return account.type;
  };

  const getAccountDisplay = (account: any) => {
    if (account.type === 'email') return account.address;
    if (account.type === 'google_oauth') return account.email || 'Google Account';
    if (account.type === 'twitter_oauth') return account.username || 'Twitter Account';
    if (account.type === 'discord_oauth') return account.username || 'Discord Account';
    if (account.type === 'wallet') return `${account.address.slice(0, 6)}...${account.address.slice(-4)}`;
    return account.address || 'Unknown';
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'email':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'google':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        );
      case 'twitter':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
        );
      case 'discord':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
        );
      case 'wallet':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleLink = async (type: string) => {
    setLinking(type);
    setError(null);
    try {
      switch (type) {
        case 'email':
          await linkEmail();
          break;
        case 'google':
          await linkGoogle();
          break;
        case 'twitter':
          await linkTwitter();
          break;
        case 'wallet':
          await linkWallet();
          break;
      }
      setLinking(null);
    } catch (err: any) {
      setError(err.message || `Failed to link ${type}`);
      setLinking(null);
    }
  };

  const handleUnlink = async (account: any) => {
    setLinking('unlink');
    setError(null);
    try {
      const accountType = getAccountType(account);
      
      switch (accountType) {
        case 'email':
          await unlinkEmail(account.address);
          break;
        case 'wallet':
          await unlinkWallet(account.address);
          break;
        case 'google':
          // Google accounts use subject property
          await unlinkGoogle(account.subject || account.id);
          break;
        case 'twitter':
          // Twitter accounts use subject property
          await unlinkTwitter(account.subject || account.id);
          break;
        case 'discord':
          // Discord accounts use subject property
          await unlinkDiscord(account.subject || account.id);
          break;
        default:
          throw new Error(`Unsupported account type: ${accountType}`);
      }
      setLinking(null);
    } catch (err: any) {
      setError(err.message || 'Failed to unlink account');
      setLinking(null);
    }
  };

  const isLinked = (type: string) => {
    return linkedAccounts.some(acc => getAccountType(acc) === type);
  };

  const canUnlink = (account: any) => {
    // Don't allow unlinking if it's the only account
    return linkedAccounts.length > 1;
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Linked Accounts</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Linked Accounts */}
      <div className="space-y-2 mb-4">
        <div className="text-xs font-medium text-gray-500 uppercase mb-2">Connected</div>
        {linkedAccounts.length === 0 ? (
          <p className="text-sm text-gray-400">No accounts linked</p>
        ) : (
          linkedAccounts.map((account: any) => {
            const type = getAccountType(account);
            const display = getAccountDisplay(account);
            return (
              <div
                key={account.id || account.address}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="text-gray-600">
                    {getAccountIcon(type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 capitalize">{type}</div>
                    <div className="text-xs text-gray-500">{display}</div>
                  </div>
                </div>
                {canUnlink(account) && (
                  <button
                    onClick={() => handleUnlink(account)}
                    disabled={linking === 'unlink'}
                    className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Unlink
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Link New Accounts */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-500 uppercase mb-2">Link New Account</div>
        <div className="grid grid-cols-2 gap-2">
          {!isLinked('email') && (
            <button
              onClick={() => handleLink('email')}
              disabled={!!linking}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {getAccountIcon('email')}
              <span>Email</span>
            </button>
          )}
          {!isLinked('google') && (
            <button
              onClick={() => handleLink('google')}
              disabled={!!linking}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {getAccountIcon('google')}
              <span>Google</span>
            </button>
          )}
          {!isLinked('twitter') && (
            <button
              onClick={() => handleLink('twitter')}
              disabled={!!linking}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {getAccountIcon('twitter')}
              <span>Twitter</span>
            </button>
          )}
          {!isLinked('wallet') && (
            <button
              onClick={() => handleLink('wallet')}
              disabled={!!linking}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {getAccountIcon('wallet')}
              <span>Wallet</span>
            </button>
          )}
        </div>
        {linking && linking !== 'unlink' && (
          <p className="text-xs text-gray-500 mt-2">Linking {linking}...</p>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Link multiple accounts to access your profile from any login method.
      </p>
    </div>
  );
}

