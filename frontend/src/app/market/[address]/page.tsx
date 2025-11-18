"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import MarketDetail, { MarketRow } from "@/components/MarketDetail";
import { useMarkets } from "@/hooks/useMarkets";
import axios from "axios";

export default function MarketPage() {
  const params = useParams();
  const router = useRouter();
  const marketAddress = params.address as string;
  const { markets, loading } = useMarkets();
  const [marketRow, setMarketRow] = useState<MarketRow | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(true);

  useEffect(() => {
    if (!marketAddress) return;

    const loadMarket = async () => {
      setLoadingMarket(true);
      try {
        // Find market in the markets list
        const market = markets.find(
          (m) => m.address.toLowerCase() === marketAddress.toLowerCase()
        );

        if (market) {
          // Get marketId from backend if not available
          let marketId = market.marketId;
          let backendMarketData: any = null;
          if (!marketId) {
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
              const backendMarkets = await axios.get(`${API_URL}/api/markets`);
              backendMarketData = backendMarkets.data.find(
                (m: any) => m.market_address?.toLowerCase() === marketAddress.toLowerCase()
              );
              if (backendMarketData) {
                marketId = backendMarketData.market_id;
              }
            } catch (err) {
              console.error("Failed to fetch market ID:", err);
            }
          } else {
            // Fetch backend market data to get oracle_type
            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
              const backendMarkets = await axios.get(`${API_URL}/api/markets`);
              backendMarketData = backendMarkets.data.find(
                (m: any) => m.market_address?.toLowerCase() === marketAddress.toLowerCase() || m.market_id === marketId
              );
            } catch (err) {
              console.error("Failed to fetch backend market data:", err);
            }
          }

          const row: MarketRow = {
            id: marketId || 0,
            onchainAddress: market.address,
            questionOffchain: market.question,
            category: market.category,
            creator_address: market.creatorAddress,
            oracle_type: backendMarketData?.oracle_type || undefined,
            oracle_name: backendMarketData?.oracle_name || undefined,
            oracle_resolution_time: backendMarketData?.oracle_resolution_time || undefined,
          };
          setMarketRow(row);
        } else if (!loading) {
          // Market not found
          console.error("Market not found:", marketAddress);
        }
      } catch (error) {
        console.error("Error loading market:", error);
      } finally {
        setLoadingMarket(false);
      }
    };

    if (!loading) {
      loadMarket();
    }
  }, [marketAddress, markets, loading]);

  const handleClose = () => {
    router.push("/");
  };

  if (loadingMarket || !marketRow) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <button
              onClick={handleClose}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Markets
            </button>
          </div>
          <div className="text-center py-12">
            <div className="text-gray-500">Loading market...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="mb-4">
          <button
            onClick={handleClose}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Markets
          </button>
        </div>
        <MarketDetail market={marketRow} onClose={handleClose} />
      </div>
    </Layout>
  );
}

