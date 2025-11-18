"use client";

import { Fragment } from "react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="pr-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 font-caveat">About Prophezy</h2>
            
            <div className="space-y-4 text-gray-700">
              <p className="text-sm leading-relaxed">
                <strong className="text-gray-900">Prophezy</strong> is a prediction market platform that makes betting on real-world events as simple as creating a poll.
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-black font-semibold">⚡ Fast:</span>
                  <span>Chainlink for price feeds, UMA for arbitrary events <span className="text-yellow-600">(Work in Progress - requires offchain router/mirror, not supported on BNB Testnet)</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black font-semibold">🆓 Gasless:</span>
                  <span>Account abstraction - no gas fees, no wallet needed</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-black font-semibold">🚀 Simple:</span>
                  <span>Create markets in 30 seconds, predict anything</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Built on <strong className="text-gray-700">BNB Chain</strong> • Powered by Chainlink & UMA oracles
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  ⚠️ UMA is work in progress (requires offchain router/mirror, not supported on BNB Testnet)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

