import React from "react";
import toast from "react-hot-toast";

/**
 * Toast notification utilities
 * Replaces alert() calls with better UX
 */

export const showToast = {
  success: (message: string, txHash?: string) => {
    toast.success(
      <div>
        <div className="font-medium">{message}</div>
        {txHash && (
          <div className="text-xs mt-1 opacity-90">
            <a
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              onClick={(e) => e.stopPropagation()}
            >
              View on BSCScan
            </a>
          </div>
        )}
      </div>,
      { duration: txHash ? 6000 : 3000 }
    );
  },

  error: (message: string) => {
    toast.error(message, { duration: 5000 });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, messages);
  },

  transaction: (txHash: string, message: string = "Transaction submitted") => {
    const copyHash = () => {
      navigator.clipboard.writeText(txHash);
      toast.success("Transaction hash copied!", { duration: 2000 });
    };

    return toast.success(
      <div>
        <div className="font-medium">{message}</div>
        <div className="text-xs mt-1 opacity-90 font-mono break-all flex items-center gap-2">
          <span>{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyHash();
            }}
            className="text-blue-400 hover:text-blue-300 transition"
            title="Copy transaction hash"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <div className="text-xs mt-1 flex items-center gap-2">
          <a
            href={`https://testnet.bscscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            View on BSCScan →
          </a>
        </div>
      </div>,
      { duration: 6000 }
    );
  },
};
