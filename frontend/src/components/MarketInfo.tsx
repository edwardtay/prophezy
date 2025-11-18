"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { showToast } from "../lib/toast";

interface InfoNote {
  id: number;
  market_id: number;
  user_address: string;
  title: string;
  content: string;
  link_url: string | null;
  created_at: string;
  updated_at: string;
}

interface MarketInfoProps {
  marketId: number;
}

export default function MarketInfo({ marketId }: MarketInfoProps) {
  const { authenticated, user } = usePrivy();
  const [notes, setNotes] = useState<InfoNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    linkUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const address =
    user?.wallet?.address ||
    user?.wallet?.addresses?.[0] ||
    user?.linkedAccounts?.find((acc: any) => acc.type === "wallet")?.address;

  useEffect(() => {
    fetchNotes();
  }, [marketId]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/info`
      );
      setNotes(response.data);
    } catch (error) {
      console.error("Failed to fetch info notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !address) {
      showToast.error("Please sign in to add information");
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      showToast.error("Please fill in both title and content");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/info`,
        {
          userAddress: address,
          title: formData.title.trim(),
          content: formData.content.trim(),
          linkUrl: formData.linkUrl.trim() || undefined,
        }
      );
      setFormData({ title: "", content: "", linkUrl: "" });
      setShowForm(false);
      await fetchNotes();
    } catch (error: any) {
      console.error("Failed to submit info note:", error);
      const errorMsg = error.response?.data?.error || "Failed to submit info";
      showToast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-900">
          Information & Resources ({notes.length})
        </h4>
        {authenticated && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            {showForm ? "Cancel" : "+ Add Info"}
          </button>
        )}
      </div>

      {/* Add Info Form */}
      {showForm && authenticated && (
        <form
          onSubmit={handleSubmit}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Brief title for this information"
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              maxLength={255}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Share relevant information, analysis, or insights..."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              rows={4}
              maxLength={5000}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link (optional)
            </label>
            <input
              type="url"
              value={formData.linkUrl}
              onChange={(e) =>
                setFormData({ ...formData, linkUrl: e.target.value })
              }
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setFormData({ title: "", content: "", linkUrl: "" });
              }}
              className="px-4 py-2 bg-white hover:bg-gray-50 border border-blue-300 text-blue-800 rounded-lg font-medium transition text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Info Notes List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading info...</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <p className="mb-2">No information shared yet.</p>
          {authenticated && (
            <p className="text-sm text-gray-400">
              Be the first to share relevant information!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-base font-semibold text-gray-900">
                  {note.title}
                </h5>
                <span className="text-xs text-gray-500 ml-2">
                  {formatDistanceToNow(new Date(note.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-3 whitespace-pre-wrap break-words">
                {note.content}
              </div>
              {note.link_url && (
                <div className="mb-2">
                  <a
                    href={note.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    {note.link_url}
                  </a>
                </div>
              )}
              <div className="text-xs text-gray-500 font-mono">
                Shared by {note.user_address.slice(0, 6)}...
                {note.user_address.slice(-4)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!authenticated && notes.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
          <p className="text-sm text-yellow-800">
            Sign in to share information about this market
          </p>
        </div>
      )}
    </div>
  );
}



