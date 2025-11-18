"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from '@privy-io/react-auth';
import { BrowserProvider, Contract } from "ethers";
import * as ethers from "ethers";
import axios from "axios";
import toast from "react-hot-toast";
import factoryArtifact from "@/abi/PredictionMarketFactory.json";
import { getMarketContract, CONTRACT_ADDRESSES, BNB_TESTNET_CHAIN_ID, ensureBNBTestnet, isOnBNBTestnet, BNB_TESTNET_FEEDS, FACTORY_ADDRESS } from "../lib/contracts";
import { showToast } from "../lib/toast";

export default function CreateMarket() {
  const router = useRouter();
  const { user, ready, authenticated } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean | null>(null);
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("Crypto");
  const thresholdDecimals = 8; // Fixed to 8 decimals (Chainlink-style)
  const [oracleType, setOracleType] = useState<"chainlink" | "uma">("chainlink");
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [availableFeedIds, setAvailableFeedIds] = useState<string[]>([]);
  const [suggestedOracle, setSuggestedOracle] = useState<"chainlink" | "uma" | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);

  // Auto-detect oracle type from question
  // Chainlink for price feeds, UMA for everything else
  const detectOracleType = (questionText: string): "chainlink" | "uma" | null => {
    const lower = questionText.toLowerCase();
    
    // Check for crypto/asset symbols first (strong indicator of price feed question)
    const cryptoSymbols = ['btc', 'bitcoin', 'eth', 'ethereum', 'bnb', 'binance', 'usdt', 'tether', 
                          'usdc', 'sol', 'solana', 'ada', 'cardano', 'doge', 'dogecoin'];
    const hasCryptoSymbol = cryptoSymbols.some(symbol => {
      const regex = new RegExp(`\\b${symbol}\\b`, 'i');
      return regex.test(questionText);
    });
    
    // Strict price-related keywords (only actual price terms)
    const priceKeywords = ['price', 'cost', 'value', '$', 'usd', 'dollar'];
    const hasPriceKeyword = priceKeywords.some(kw => lower.includes(kw));
    
    // Price comparison keywords
    const priceComparisonKeywords = ['above', 'below', 'reach', 'exceed', 'surpass', 'drop to', 'fall to', 'close'];
    const hasPriceComparison = priceComparisonKeywords.some(kw => lower.includes(kw));
    
    // Numeric patterns with $ sign (actual price thresholds)
    const hasPriceThreshold = /\$\d+/.test(questionText);
    
    // Arbitrary event keywords → UMA
    const eventKeywords = ['mint', 'launch', 'release', 'happen', 'occur', 'event', 'announcement', 
                          'mentions', 'hashtag', 'tps', 'throughput', 'followers', 'views', 'likes',
                          'return', 'jesus', 'aliens', 'contact', 'meme', 'viral'];
    const hasEvent = eventKeywords.some(kw => lower.includes(kw));
    
    // Address-related → UMA (for NFT mints, etc)
    const hasAddress = /0x[a-fA-F0-9]{40}/.test(questionText) || lower.includes('address');
    
    // If it has event keywords or address, it's UMA (not price feed)
    if (hasEvent || hasAddress) {
      return "uma";
    }
    
    // Only detect as price feed if it has BOTH crypto symbol AND (price keyword OR price comparison OR price threshold)
    // This prevents false positives for questions like "Will Somnia reach 10,000 TPS?" 
    const isPriceFeedQuestion = hasCryptoSymbol && (hasPriceKeyword || hasPriceComparison || hasPriceThreshold);
    
    if (isPriceFeedQuestion) {
      // Use Chainlink for price feeds
      return "chainlink";
    }
    
    // Default to UMA for everything else (arbitrary events)
    return "uma";
  };

  // Market templates
  const marketTemplates = [
    {
      name: "Price Prediction",
      question: "Will Bitcoin reach $100k by December 31, 2025?",
      feedId: "BTC",
      threshold: "100000",
      oracle: "chainlink" as const,
      category: "Crypto"
    },
    {
      name: "Sports Event",
      question: "Will the Lakers win the NBA Championship in 2025?",
      feedId: "UMA",
      threshold: "1",
      oracle: "uma" as const,
      category: "Sports"
    },
    {
      name: "Weather Event",
      question: "Will New York City receive more than 50 inches of snow this winter?",
      feedId: "UMA",
      threshold: "1",
      oracle: "uma" as const,
      category: "Other"
    }
  ];

  // Auto-extract feedId and threshold from question
  const extractFeedIdAndThreshold = (questionText: string): { feedId: string; threshold: string } => {
    // Extract feedId - look for common crypto symbols
    const cryptoPatterns = [
      { pattern: /\b(BITCOIN|BTC)\b/i, feedId: "BTC" },
      { pattern: /\b(ETHEREUM|ETH)\b/i, feedId: "ETH" },
      { pattern: /\b(BNB|BINANCE)\b/i, feedId: "BNB" },
      { pattern: /\b(USDT|TETHER)\b/i, feedId: "USDT" },
      { pattern: /\b(USDC|USD COIN)\b/i, feedId: "USDC" },
      { pattern: /\b(SOL|SOLANA)\b/i, feedId: "SOL" },
      { pattern: /\b(ADA|CARDANO)\b/i, feedId: "ADA" },
      { pattern: /\b(DOGE|DOGECOIN)\b/i, feedId: "DOGE" },
    ];
    
    let detectedFeedId = "BNB"; // Default
    for (const { pattern, feedId } of cryptoPatterns) {
      if (pattern.test(questionText)) {
        detectedFeedId = feedId;
        break;
      }
    }
    
    // Extract threshold - look for price patterns like $100k, $100000, 100k, etc.
    const pricePatterns = [
      /\$(\d+(?:\.\d+)?)\s*(K|THOUSAND)/i, // $100k, $100 thousand
      /\$(\d+(?:\.\d+)?)\s*(M|MILLION)/i, // $100m, $100 million
      /\$(\d+(?:\.\d+)?)\s*(B|BILLION)/i, // $100b, $100 billion
      /\$(\d+(?:\.\d+)?)/, // $100000
      /(\d+(?:\.\d+)?)\s*(K|THOUSAND)/i, // 100k, 100 thousand
      /(\d+(?:\.\d+)?)\s*(M|MILLION)/i, // 100m, 100 million
      /(\d+(?:\.\d+)?)\s*(B|BILLION)/i, // 100b, 100 billion
      /(\d+(?:\.\d+)?)/, // 100000
    ];
    
    let detectedThreshold = "2500"; // Default
    for (const pattern of pricePatterns) {
      const match = questionText.match(pattern);
      if (match) {
        let value = parseFloat(match[1]);
        const multiplier = match[2]?.toUpperCase();
        if (multiplier === "K" || multiplier === "THOUSAND") {
          value *= 1000;
        } else if (multiplier === "M" || multiplier === "MILLION") {
          value *= 1000000;
        } else if (multiplier === "B" || multiplier === "BILLION") {
          value *= 1000000000;
        }
        detectedThreshold = Math.round(value).toString();
        break;
      }
    }
    
    return { feedId: detectedFeedId, threshold: detectedThreshold };
  };

  // Get feedId and threshold from question (auto-extracted)
  const { feedId, threshold } = extractFeedIdAndThreshold(question);

  // Handle question change with auto-detection
  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    const detected = detectOracleType(value);
    if (detected) {
      setSuggestedOracle(detected);
      setOracleType(detected);
    } else {
      setSuggestedOracle(null);
      // Default to chainlink if no detection
      if (oracleType === "uma") {
        setOracleType("chainlink");
      }
    }
  };

  // Apply template
  const applyTemplate = (template: typeof marketTemplates[0]) => {
    setQuestion(template.question);
    setOracleType(template.oracle);
    setCategory(template.category);
    setSuggestedOracle(template.oracle);
  };

  // Ask AI to generate market question
  const askAI = async () => {
    if (!aiPrompt.trim()) {
      showToast.error("Please enter a prompt for the AI");
      return;
    }

    setAiLoading(true);
    try {
      // Use Hugging Face Inference API (free tier)
      // Using GPT-2 or a smaller model that works reliably without auth
      // Try multiple models for better reliability
      const models = [
        "gpt2",
        "distilgpt2",
        "microsoft/DialoGPT-small"
      ];
      
      let lastError: Error | null = null;
      
      for (const model of models) {
        try {
          const response = await fetch(
            `https://api-inference.huggingface.co/models/${model}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                inputs: `Generate a creative prediction market question. Prompt: "${aiPrompt}"

Examples:
- Will aliens make first contact by December 31, 2025?
- Will a cat become the first pet to reach 1M Instagram followers this year?
- Will Bitcoin reach $100k by 2025?
- Will a new viral meme reach 10M shares this month?

Question: Will`,
                parameters: {
                  max_new_tokens: 50,
                  temperature: 0.9,
                  return_full_text: false,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            
            // Extract the generated text
            let generatedText = "";
            if (Array.isArray(data) && data[0]?.generated_text) {
              generatedText = data[0].generated_text;
            } else if (data.generated_text) {
              generatedText = data.generated_text;
            } else if (typeof data === 'string') {
              generatedText = data;
            }

            // Clean up the text
            let question = generatedText.trim();
            // Remove the prompt part if present
            question = question.replace(/.*Question:\s*/i, '').trim();
            // Ensure it starts with "Will"
            if (!question.startsWith('Will')) {
              question = 'Will ' + question;
            }
            // Ensure it ends with ?
            if (!question.endsWith('?')) {
              question += '?';
            }
            // Take first sentence/question
            question = question.split(/[.!?]/)[0] + '?';

            if (question && question.length > 10 && question.includes('?')) {
              setQuestion(question);
              handleQuestionChange(question);
              setAiPrompt("");
              setShowAiPrompt(false);
              setAiLoading(false);
              return;
            }
          } else if (response.status === 503) {
            // Model loading, try next one
            continue;
          }
        } catch (err: any) {
          lastError = err;
          continue;
        }
      }
      
      // If all models failed, throw error
      throw lastError || new Error("All AI models failed");
    } catch (error: any) {
      console.error("AI generation failed:", error);
      
      // Fallback: Use intelligent template-based generation
      const promptLower = aiPrompt.toLowerCase();
      let fallback = "";
      
      // Detect what type of question they want
      if (promptLower.includes('jesus') || promptLower.includes('christ')) {
        fallback = "Will Jesus return to Earth in 2025?";
      } else if (promptLower.includes('alien') || promptLower.includes('ufo') || promptLower.includes('contact')) {
        fallback = "Will aliens make first contact with Earth by December 31, 2025?";
      } else if (promptLower.includes('meme') || promptLower.includes('viral')) {
        fallback = "Will a new meme reach 1M shares on social media this month?";
      } else if (promptLower.includes('cat') || promptLower.includes('pet') || promptLower.includes('animal')) {
        fallback = "Will a cat become the first pet to reach 1M Instagram followers this year?";
      } else if (promptLower.includes('funny') || promptLower.includes('weird') || promptLower.includes('crazy')) {
        const funnyTemplates = [
          "Will someone break the world record for longest TikTok dance by 2025?",
          "Will a penguin be elected mayor of a city in 2025?",
          "Will someone eat 100 hot dogs in under 5 minutes this year?",
          "Will a dog learn to speak English by 2025?",
        ];
        fallback = funnyTemplates[Math.floor(Math.random() * funnyTemplates.length)];
      } else {
        // Generic fallback with variations
        const templates = [
          `Will ${aiPrompt} happen in 2025?`,
          `Will ${aiPrompt} reach 1M by the end of this year?`,
          `Will ${aiPrompt} occur before December 31, 2025?`,
          `Will ${aiPrompt} become reality by 2025?`,
        ];
        fallback = templates[Math.floor(Math.random() * templates.length)];
      }
      
      setQuestion(fallback);
      handleQuestionChange(fallback);
      setAiPrompt("");
      setShowAiPrompt(false);
      
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    // Get wallet address from Privy or window.ethereum
    const checkWallet = async () => {
      if (ready && authenticated && user) {
        const addr = user?.wallet?.address || 
                     (user?.linkedAccounts?.find((acc: any) => acc.type === 'wallet') as any)?.address;
        setWalletAddress(addr || null);
      } else if (typeof window !== "undefined" && window.ethereum) {
        // Fallback to window.ethereum if Privy not available
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      }

      // Check network
      if (typeof window !== "undefined" && window.ethereum) {
        const onCorrectNetwork = await isOnBNBTestnet();
        setIsCorrectNetwork(onCorrectNetwork);
      }
    };

    checkWallet();

    // Listen for network changes
    const handleChainChanged = async () => {
      const onCorrectNetwork = await isOnBNBTestnet();
      setIsCorrectNetwork(onCorrectNetwork);
    };

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [ready, authenticated, user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast.error('Image size must be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImage(base64String);
        setImagePreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleCreate = async () => {
    if (!question.trim()) {
      showToast.error("Please enter a question");
      return;
    }
    
    if (!walletAddress) {
      showToast.error("Please connect your wallet first");
      return;
    }

    // Map feedId to feedAddress from BNB_TESTNET_FEEDS
    const selectedSymbol = feedId.trim().toUpperCase();
    const feedAddress = BNB_TESTNET_FEEDS[selectedSymbol as keyof typeof BNB_TESTNET_FEEDS];
    
    if (!feedAddress) {
      showToast.error(`Feed "${selectedSymbol}" not found. Available feeds: ${Object.keys(BNB_TESTNET_FEEDS).join(", ")}`);
      return;
    }

    const finalThreshold = threshold && parseFloat(threshold) > 0 ? threshold : "2500";
    
    if (!finalThreshold || parseFloat(finalThreshold) <= 0) {
      showToast.error("Please enter a valid strike price");
      return;
    }

    setLoading(true);
    let loadingToast: string | undefined;
    let confirmingToast: string | undefined;
    
    try {
      loadingToast = showToast.loading("Creating market...");
      // Ensure we're on BNB Testnet before any transaction
      await ensureBNBTestnet();

      // Check for wallet provider
      if (!window.ethereum) {
        throw new Error("No wallet provider found");
      }

      // Get provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Double-check we're on the correct network
      const network = await provider.getNetwork();
      
      if (Number(network.chainId) !== BNB_TESTNET_CHAIN_ID) {
        throw new Error(`Please switch to BNB Testnet (Chain ID: ${BNB_TESTNET_CHAIN_ID}). Current: ${network.chainId}`);
      }

      // Create factory contract instance
      const factory = new Contract(
        FACTORY_ADDRESS,
        factoryArtifact.abi,
        signer
      );
      
      // Calculate deadline (7 days from now)
      const duration = 7 * 24 * 60 * 60; // 7 days in seconds
      const deadlineUnix = Math.floor(Date.now() / 1000) + duration;
      
      // Convert strike price to BigInt with 8 decimals
      const strikePriceRaw = BigInt(Math.floor(parseFloat(finalThreshold) * 10 ** thresholdDecimals));

      // Simplest – let ethers / wallet handle gas values
      const tx = await factory.createMarket(
        feedAddress,
        question,
        deadlineUnix,
        strikePriceRaw
      );

      console.log("Tx sent:", tx.hash);
      
      // Show transaction submitted
      if (loadingToast) toast.dismiss(loadingToast);
      showToast.transaction(tx.hash, "Market creation transaction submitted!");
      
      // Wait for transaction to be mined and extract market address from event
      let marketAddress = "";
      confirmingToast = showToast.loading("Waiting for confirmation...");
      try {
        const receipt = await tx.wait();
        console.log("Tx mined:", receipt.hash);
        
        // Parse MarketCreated event from receipt
        if (receipt && factory.interface) {
          const iface = factory.interface;
          const marketCreatedEvent = iface.getEvent("MarketCreated");
          if (marketCreatedEvent) {
            const eventTopic = marketCreatedEvent.topicHash;
            
            // Find MarketCreated event in logs
            for (const log of receipt.logs || []) {
              if (log.topics[0] === eventTopic) {
              const decoded = iface.decodeEventLog("MarketCreated", log.data, log.topics);
              marketAddress = decoded.market;
              break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error waiting for transaction or parsing event:", error);
        if (confirmingToast) toast.dismiss(confirmingToast);
      }

      if (confirmingToast) toast.dismiss(confirmingToast);
      
      if (marketAddress) {
        showToast.success(
          `Market created! Question: ${question}`,
          tx.hash
        );
      } else {
        showToast.success("Market creation confirmed!", tx.hash);
      }

      // Store metadata off-chain (question, category, image, oracle type, market address)
      // This allows the market to be displayed in the market list
      if (marketAddress && walletAddress) {
        try {
          // Calculate duration (7 days default) and resolution delay based on oracle type
          const duration = 7 * 24 * 60 * 60; // 7 days in seconds
          const resolutionDelays: Record<string, number> = {
            chainlink: 24 * 60 * 60, // 24 hours
            uma: 48 * 60 * 60, // 48 hours (UMA resolver on Sepolia + relayer to BNB)
          };
          const resolutionDelay = resolutionDelays[oracleType] || 24 * 60 * 60; // Default to Chainlink (24hr)

          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/markets`,
            {
              question,
              category,
              duration,
              resolutionDelay,
              imageUrl: image,
              oracleType,
              creatorAddress: walletAddress,
              marketAddress: marketAddress, // Include market address
            }
          );
        } catch (error) {
          console.error("Failed to store market metadata:", error);
          // Don't fail the whole operation if metadata storage fails
        }
      } else if (!marketAddress) {
        console.warn("Market address not available yet, metadata will be stored later");
        // Could implement a retry mechanism here if needed
      }

      // Reset form
      setQuestion("");
      setCategory("Crypto");
      setOracleType("chainlink");
      setImage(null);
      setImagePreview(null);
      
      // Navigate to markets page to see the new market
      // Add refresh parameter to trigger refetch
      setTimeout(() => {
        router.push("/?refresh=true");
        // Also refresh after a bit more time to ensure backend has the data
        setTimeout(() => {
          router.refresh();
        }, 3000);
      }, 2000); // Give time for transaction to be mined
    } catch (error: any) {
      console.error("Failed to create market", error);
      let errorMsg = "Failed to create market";
      
      if (error.code === 4001) {
        errorMsg = "Transaction rejected by user";
      } else if (error.message) {
        errorMsg = error.message;
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.data) {
        errorMsg = `Contract error: ${JSON.stringify(error.data)}`;
      }
      
      // Show detailed error for debugging
      console.error("Full error details:", {
        code: error.code,
        message: error.message,
        reason: error.reason,
        data: error.data,
        error: error,
      });
      
      if (loadingToast) toast.dismiss(loadingToast);
      if (confirmingToast) toast.dismiss(confirmingToast);
      showToast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Market</h2>
        <p className="text-sm text-gray-500">Launch a new prediction market in seconds</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 md:p-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Market Templates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Templates
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {marketTemplates.map((template, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="text-left px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition text-gray-700"
                >
                  <div className="font-medium">{template.name}</div>
                  <div className="text-gray-500 truncate mt-0.5">{template.question}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Question
              </label>
              <button
                type="button"
                onClick={() => setShowAiPrompt(!showAiPrompt)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {showAiPrompt ? "Hide AI" : "Ask AI"}
              </button>
            </div>
            
            {showAiPrompt && (
              <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <label className="block text-xs font-medium text-purple-700 mb-2">
                  What kind of market do you want? (e.g., "will aliens contact us", "viral meme", "crypto price prediction")
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !aiLoading) {
                        askAI();
                      }
                    }}
                    placeholder="e.g., will aliens contact us in 2025"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-purple-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={aiLoading}
                  />
                  <button
                    type="button"
                    onClick={askAI}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {aiLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Generate
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-xs text-purple-600">
                  💡 Try prompts like: "aliens contact", "viral meme", "crypto prediction", "sports event", "will jesus return"
                </p>
              </div>
            )}
            
            <input
              type="text"
              value={question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              placeholder="Will Bitcoin reach $100k by 2025?"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm sm:text-base"
            />
            {suggestedOracle && (
              <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Auto-suggested: <strong>{suggestedOracle.charAt(0).toUpperCase() + suggestedOracle.slice(1)}</strong> oracle</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Market Image (Optional)
            </label>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg
                    className="w-12 h-12 text-gray-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-gray-600 font-medium">Click to upload image</span>
                  <span className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Market preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-300"
                />
                <button
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Oracle Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setOracleType("chainlink");
                  setSuggestedOracle(null);
                }}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 font-medium transition text-sm sm:text-base ${
                  oracleType === "chainlink"
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Chainlink</span>
                  {suggestedOracle === "chainlink" && (
                    <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">AI</span>
                  )}
                </div>
                <div className="text-xs mt-1 opacity-75">Price Feeds (24hr)</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOracleType("uma");
                  setSuggestedOracle(null);
                }}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 font-medium transition text-sm sm:text-base ${
                  oracleType === "uma"
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>UMA</span>
                  {suggestedOracle === "uma" && (
                    <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">AI</span>
                  )}
                </div>
                <div className="text-xs mt-1 opacity-75">Arbitrary Events (48hr)</div>
              </button>
            </div>
            {oracleType === "uma" && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  <strong>⚠️ Work in Progress:</strong> UMA requires an offchain router/mirror (not supported on BNB Testnet). Currently in development.
                </p>
              </div>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Chainlink for price-based markets • UMA for arbitrary events (resolver on Sepolia, relayer to BNB)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category (Metadata)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="Crypto">Crypto</option>
              <option value="Sports">Sports</option>
              <option value="Politics">Politics</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Category is stored off-chain for display purposes only
            </p>
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !question.trim() || !walletAddress}
            className="w-full px-6 py-3.5 bg-black text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating on-chain...
              </span>
            ) : (
              "Create Market on BNB Testnet"
            )}
          </button>

          {!walletAddress && (
            <p className="text-sm text-center text-gray-500">
              Please connect your wallet to create a market
            </p>
          )}

          {walletAddress && (
            <div className="mt-4 space-y-2">
              <div className={`p-3 rounded-lg border ${
                isCorrectNetwork 
                  ? "bg-green-50 border-green-200" 
                  : "bg-yellow-50 border-yellow-200"
              }`}>
                <p className="text-xs font-medium mb-1">
                  {isCorrectNetwork ? (
                    <span className="text-green-800">✓ Connected to BNB Testnet</span>
                  ) : (
                    <span className="text-yellow-800">⚠ Please switch to BNB Testnet</span>
                  )}
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Wallet:</strong> {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>Factory:</strong> {CONTRACT_ADDRESSES.PREDICTION_MARKET_FACTORY.slice(0, 6)}...{CONTRACT_ADDRESSES.PREDICTION_MARKET_FACTORY.slice(-4)}
                </p>
              </div>
              {!isCorrectNetwork && (
                <button
                  onClick={async () => {
                    try {
                      await ensureBNBTestnet();
                      const onCorrectNetwork = await isOnBNBTestnet();
                      setIsCorrectNetwork(onCorrectNetwork);
                    } catch (error: any) {
                      if (error.message?.includes("rejected") || error.message?.includes("Please switch")) {
                        showToast.error("Please switch to BNB Testnet to continue");
                      } else {
                        showToast.error(`Failed to switch network: ${error.message}`);
                      }
                    }
                  }}
                  className="w-full px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition"
                >
                  Switch to BNB Testnet
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
