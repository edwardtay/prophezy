"use client";

import { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { showToast } from "../lib/toast";

interface ChatMessage {
  id: number;
  market_id: number;
  user_address: string;
  message: string;
  created_at: string;
}

interface MarketChatProps {
  marketId: number;
}

export default function MarketChat({ marketId }: MarketChatProps) {
  const { authenticated, user } = usePrivy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const address =
    user?.wallet?.address ||
    (user?.linkedAccounts?.find((acc: any) => acc.type === "wallet") as any)?.address;

  useEffect(() => {
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [marketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/chat`
      );
      setMessages(response.data);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !authenticated || !address) {
      if (!authenticated) {
        showToast.error("Please sign in to chat");
      }
      return;
    }

    setSending(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets/${marketId}/chat`,
        {
          userAddress: address,
          message: newMessage.trim(),
        }
      );
      setNewMessage("");
      await fetchMessages();
    } catch (error: any) {
      console.error("Failed to send message:", error);
      const errorMsg =
        error.response?.data?.error || "Failed to send message";
      showToast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border-t border-gray-200 pt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4">
        Discussion ({messages.length})
      </h4>

      {/* Messages */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwnMessage = msg.user_address === address;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isOwnMessage
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-900 border border-gray-200"
                    }`}
                  >
                    {!isOwnMessage && (
                      <div className="text-xs font-mono mb-1 opacity-75">
                        {msg.user_address.slice(0, 6)}...
                        {msg.user_address.slice(-4)}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {authenticated ? (
        <div className="flex gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            rows={2}
            maxLength={1000}
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-800">
            Please sign in to participate in the discussion
          </p>
        </div>
      )}
    </div>
  );
}



