from fastapi import APIRouter, Depends, Query
from app.services.quantel_service import QuantelService
from app.utils.auth import get_current_user
from typing import Dict, List, Optional

router = APIRouter(prefix="/quantel", tags=["Quantel Intelligence"])
quantel_service = QuantelService()

@router.get("/analysis/{symbol}")
async def get_comprehensive_analysis(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Deep analysis including fundamentals, news, and scores"""
    analysis = await quantel_service.get_comprehensive_analysis(symbol)
    if not analysis:
        raise HTTPException(status_code=404, detail="Symbol not found or analysis failed")
    return analysis

@router.get("/market-data/{symbol}")
async def get_market_data(
    symbol: str, 
    period: str = Query("1mo", description="Historical period (1d, 5d, 1mo, 6mo, 1y, 5y, max)"),
    interval: str = Query("1d", description="Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)"),
    current_user: Dict = Depends(get_current_user)
):
    """Get OHLC data for charts"""
    data = await quantel_service.get_market_data(symbol, period, interval)
    return {"symbol": symbol, "ohlc": data}

@router.get("/predict/{symbol}")
async def predict_price(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Predict stock prices using ARIMA model (Quantel Engine)"""
    prediction = await quantel_service.get_price_prediction(symbol)
    return {"symbol": symbol, "prediction": prediction}

@router.get("/indicators/{symbol}")
async def get_indicators(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Get technical indicators (RSI, MACD, BB) for a symbol"""
    indicators = await quantel_service.get_technical_indicators(symbol)
    return indicators

@router.post("/portfolio/optimize")
async def optimize_weights(symbols: List[str], current_user: Dict = Depends(get_current_user)):
    """Optimize portfolio assets based on Mean-Variance Optimization"""
    optimization = await quantel_service.optimize_portfolio(symbols)
    return optimization

@router.get("/risk/{symbol}")
async def get_risk(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Fetch risk metrics like VaR and Volatility for a stock"""
    risk = await quantel_service.get_risk_metrics(symbol)
    return {"symbol": symbol, "risk": risk}

@router.get("/trade/signals/{symbol}")
async def get_trade_signals(symbol: str, current_user: Dict = Depends(get_current_user)):
    """Determine BUY/SELL/HOLD signals based on technical analysis"""
    indicators = await quantel_service.get_technical_indicators(symbol)
    if not indicators:
        return {"signal": "neutral", "reason": "No data available"}
    
    # Simple logic
    score = 0
    if indicators["rsi"] < 30: score += 1 # Oversold (Buy)
    elif indicators["rsi"] > 70: score -= 1 # Overbought (Sell)
    
    if indicators["macd"] > indicators["macd_signal"]: score += 1 # MACD Crossover bullish
    elif indicators["macd"] < indicators["macd_signal"]: score -= 1 # MACD Crossover bearish
    
    if indicators["trend"] == "bullish": score += 1
    
    signal = "hold"
    if score >= 2: signal = "buy"
    elif score <= -2: signal = "sell"
    
    return {
        "symbol": symbol,
        "signal": signal,
        "score": score,
        "indicators": indicators
    }
