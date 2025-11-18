"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { privyConfig } from "../lib/privy";
import { showToast } from "../lib/toast";
import AccountLinking from "./AccountLinking";

export function AuthSectionWithPrivy() {
  // This component only renders when PrivyProvider is in the tree
  // So we can safely call usePrivy hook
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAccountLinking, setShowAccountLinking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);
  
  if (!ready) {
    return null;
  }
  
  if (authenticated) {
    const walletAddress = 
      user?.wallet?.address ||
      (user?.linkedAccounts?.find((acc: any) => acc.type === 'wallet') as any)?.address;
    const displayAddress = walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : "";
    
    const copyAddress = () => {
      if (walletAddress) {
        navigator.clipboard.writeText(walletAddress);
        showToast.success('Address copied to clipboard!');
        setShowDropdown(false);
      }
    };
    
    const viewOnExplorer = () => {
      if (walletAddress) {
        window.open(`https://bscscan.com/address/${walletAddress}`, '_blank');
        setShowDropdown(false);
      }
    };
    
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-mono">{displayAddress}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Mobile: Simple button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="sm:hidden px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <div className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></div>
          {displayAddress}
        </button>
        
        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* Profile Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Connected Wallet</div>
              <div className="font-mono text-sm text-gray-900 break-all">{walletAddress || 'N/A'}</div>
            </div>
            
            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={copyAddress}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Address
              </button>
              
              <button
                onClick={viewOnExplorer}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on BSCScan
              </button>
              
              <div className="border-t border-gray-100 my-1"></div>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowAccountLinking(true);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Link Accounts
              </button>
              
              <div className="border-t border-gray-100 my-1"></div>
              
              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </button>
            </div>
          </div>
        )}

        {/* Account Linking Modal */}
        {showAccountLinking && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowAccountLinking(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <AccountLinking onClose={() => setShowAccountLinking(false)} />
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => login()}
        className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition"
      >
        Connect
      </button>
      {!privyConfig.appId && (
        <span className="text-xs text-gray-400">
          Set NEXT_PUBLIC_PRIVY_APP_ID to enable Google login
        </span>
      )}
    </div>
  );
}

