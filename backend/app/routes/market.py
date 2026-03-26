from fastapi import APIRouter, Depends
from app.services.market_service import MarketDataService
from app.utils.auth import get_current_user
from typing import Dict, Optional

router = APIRouter(prefix="/market", tags=["Market Data"])
market_service = MarketDataService()

@router.get("/indices")
async def get_market_indices(current_user: Dict = Depends(get_current_user)):
    """Get major market indices"""
    indices = await market_service.get_market_indices()
    return indices

@router.get("/stock/{symbol}")
async def get_stock_quote(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Get stock quote by symbol"""
    quote = await market_service.get_stock_quote(symbol)
    return {"symbol": symbol, "data": quote}

@router.get("/trending")
async def get_trending_stocks(current_user: Dict = Depends(get_current_user)):
    """Get trending stocks"""
    trending = await market_service.get_trending_stocks()
    return {"trending": trending}

@router.get("/search")
async def search_instruments(query: str, current_user: Dict = Depends(get_current_user)):
    """Search for stocks/mutual funds"""
    results = await market_service.search_instruments(query)
    return {"results": results}
