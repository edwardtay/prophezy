"""
Oracle Service for Prophezy
Integrates with Chainlink and Redstone oracles for market resolution
- Redstone: Fast resolution (15 minutes) - Primary oracle
- Chainlink: Secure fallback for high-value markets
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv
import httpx
from datetime import datetime
from web3 import Web3

load_dotenv()

app = FastAPI(title="Prophezy Oracle Service")

# Initialize Web3 provider for Chainlink
BNB_CHAIN_RPC = os.getenv("BNB_CHAIN_RPC_URL", "https://data-seed-prebsc-1-s1.binance.org:8545")
w3 = Web3(Web3.HTTPProvider(BNB_CHAIN_RPC))

# Redstone API configuration
REDSTONE_API_URL = os.getenv("REDSTONE_API_URL", "https://api.redstone.finance")
REDSTONE_API_KEY = os.getenv("REDSTONE_API_KEY", "")

# Chainlink configuration
CHAINLINK_FEED_ADDRESS = os.getenv("CHAINLINK_FEED_ADDRESS", "")


class MarketResolutionRequest(BaseModel):
    marketId: int
    question: str
    category: str
    oracleType: str  # "redstone" or "chainlink"
    dataFeedId: Optional[str] = None  # For Redstone
    threshold: Optional[float] = None  # Threshold value for comparison
    endTime: Optional[str] = None


class MarketResolution(BaseModel):
    marketId: int
    outcome: int  # 1 = yes, 2 = no
    value: float  # Oracle value
    threshold: float
    oracleType: str  # "redstone" or "chainlink"
    timestamp: str
    confidence: float  # 0.0 to 1.0 (based on oracle reliability)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "oracle"}


@app.post("/resolve", response_model=MarketResolution)
async def resolve_market(request: MarketResolutionRequest):
    """
    Resolve market using Chainlink or Redstone oracle
    """
    try:
        if request.oracleType.lower() == "redstone":
            return await resolve_with_redstone(request)
        elif request.oracleType.lower() == "chainlink":
            return await resolve_with_chainlink(request)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid oracle type: {request.oracleType}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resolution failed: {str(e)}")


async def resolve_with_redstone(request: MarketResolutionRequest) -> MarketResolution:
    """Resolve market using Redstone oracle (fast - 15 minutes)"""
    if not request.dataFeedId:
        raise HTTPException(status_code=400, detail="dataFeedId required for Redstone")
    
    if not request.threshold:
        raise HTTPException(status_code=400, detail="threshold required for resolution")
    
    # Fetch data from Redstone API
    async with httpx.AsyncClient() as client:
        headers = {}
        if REDSTONE_API_KEY:
            headers["Authorization"] = f"Bearer {REDSTONE_API_KEY}"
        
        # Redstone API endpoint for getting price/data
        response = await client.get(
            f"{REDSTONE_API_URL}/prices",
            params={"symbols": request.dataFeedId},
            headers=headers,
            timeout=10.0
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Redstone API error: {response.text}")
        
        data = response.json()
        
        # Extract value from Redstone response
        # Redstone returns data in format: {"symbol": {"value": 123.45, ...}}
        if request.dataFeedId not in data:
            raise HTTPException(status_code=404, detail=f"Data feed {request.dataFeedId} not found")
        
        value = float(data[request.dataFeedId].get("value", 0))
        
        # Determine outcome based on threshold
        outcome = 1 if value >= request.threshold else 2
        
        return MarketResolution(
            marketId=request.marketId,
            outcome=outcome,
            value=value,
            threshold=request.threshold,
            oracleType="redstone",
            timestamp=datetime.now().isoformat(),
            confidence=0.95  # Redstone has high reliability
        )


async def resolve_with_chainlink(request: MarketResolutionRequest) -> MarketResolution:
    """Resolve market using Chainlink oracle (secure but slower)"""
    if not CHAINLINK_FEED_ADDRESS:
        raise HTTPException(status_code=500, detail="Chainlink feed address not configured")
    
    if not request.threshold:
        raise HTTPException(status_code=400, detail="threshold required for resolution")
    
    # Chainlink AggregatorV3Interface ABI (simplified)
    aggregator_abi = [
        {
            "inputs": [],
            "name": "latestRoundData",
            "outputs": [
                {"name": "roundId", "type": "uint80"},
                {"name": "answer", "type": "int256"},
                {"name": "startedAt", "type": "uint256"},
                {"name": "updatedAt", "type": "uint256"},
                {"name": "answeredInRound", "type": "uint80"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    try:
        # Get price from Chainlink
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(CHAINLINK_FEED_ADDRESS),
            abi=aggregator_abi
        )
        
        round_data = contract.functions.latestRoundData().call()
        price = round_data[1] / 10**8  # Chainlink prices are typically 8 decimals
        
        # Determine outcome based on threshold
        outcome = 1 if price >= request.threshold else 2
        
        return MarketResolution(
            marketId=request.marketId,
            outcome=outcome,
            value=float(price),
            threshold=request.threshold,
            oracleType="chainlink",
            timestamp=datetime.now().isoformat(),
            confidence=0.99  # Chainlink has very high reliability
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chainlink resolution failed: {str(e)}")


@app.get("/oracle-status")
async def get_oracle_status():
    """Get status of oracle providers"""
    status = {
        "redstone": {
            "available": bool(REDSTONE_API_URL),
            "api_url": REDSTONE_API_URL
        },
        "chainlink": {
            "available": bool(CHAINLINK_FEED_ADDRESS),
            "feed_address": CHAINLINK_FEED_ADDRESS,
            "rpc_connected": w3.is_connected()
        }
    }
    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

