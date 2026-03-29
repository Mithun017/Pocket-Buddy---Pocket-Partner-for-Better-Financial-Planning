import pandas as pd
import numpy as np
import yfinance as yf
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from scipy.optimize import minimize
from statsmodels.tsa.arima.model import ARIMA
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=8)

class QuantelService:
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(minutes=5)

    def _get_market_data_sync(self, symbol: str, period: str, interval: str) -> pd.DataFrame:
        """Fetch OHLC data for candlesticks"""
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)
        return df

    async def get_market_data(self, symbol: str, period: str = "1mo", interval: str = "1d") -> List[Dict]:
        """Fetch market data formatted for candlesticks"""
        yahoo_symbol = symbol.upper()
        if not (yahoo_symbol.endswith('.NS') or yahoo_symbol.endswith('.BO')):
            yahoo_symbol = f"{yahoo_symbol}.NS"
            
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(executor, self._get_market_data_sync, yahoo_symbol, period, interval)
        
        if df.empty:
            return []
            
        # Format for lightweight-charts (Open, High, Low, Close, Time)
        ohlc = []
        for index, row in df.iterrows():
            ohlc.append({
                "time": int(index.timestamp()),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })
        return ohlc

    def _get_info_sync(self, ticker: yf.Ticker) -> Dict:
        """Fetch ticker info in a separate thread"""
        return ticker.info

    async def get_comprehensive_analysis(self, symbol: str) -> Dict:
        """Deep fundamental and comparative analysis"""
        yahoo_symbol = symbol.upper()
        if not (yahoo_symbol.endswith('.NS') or yahoo_symbol.endswith('.BO')):
            yahoo_symbol = f"{yahoo_symbol}.NS"
            
        ticker = yf.Ticker(yahoo_symbol)
        loop = asyncio.get_event_loop()
        
        # Fetch data in parallel
        info_task = loop.run_in_executor(executor, self._get_info_sync, ticker)
        holders_task = loop.run_in_executor(executor, lambda t: t.major_holders, ticker)
        news_task = loop.run_in_executor(executor, lambda t: t.news, ticker)
        calendar_task = loop.run_in_executor(executor, lambda t: t.calendar, ticker)
        tech_task = self.get_technical_indicators(symbol)
        
        try:
            info, holders, news, calendar, technicals = await asyncio.gather(
                info_task, holders_task, news_task, calendar_task, tech_task
            )
        except Exception as e:
            print(f"Error fetching analysis for {symbol}: {e}")
            return None

        # 1. Fundamental Scoring Logic
        quality_score = 0
        roe = info.get('returnOnEquity', 0)
        if roe and roe > 0.15: quality_score += 2
        elif roe and roe > 0.08: quality_score += 1
        
        margin = info.get('operatingMargins', 0)
        if margin and margin > 0.15: quality_score += 1
        
        debt_to_equity = info.get('debtToEquity', 0)
        if debt_to_equity and debt_to_equity < 50: quality_score += 1 # 50 = 0.5 ratio
        elif not debt_to_equity: quality_score += 1 # Likely debt free
        
        valuation_score = 0
        pe = info.get('trailingPE', 0)
        if pe and pe < 15: valuation_score += 2
        elif pe and pe < 25: valuation_score += 1
        
        pb = info.get('priceToBook', 0)
        if pb and pb < 3: valuation_score += 1
        
        financial_score = 0
        rev_growth = info.get('revenueGrowth', 0)
        if rev_growth and rev_growth > 0.10: financial_score += 2
        
        profit_growth = info.get('earningsGrowth', 0)
        if profit_growth and profit_growth > 0.10: financial_score += 2

        # 2. Shareholding Pattern
        shareholding = []
        if holders is not None and not holders.empty:
            # yfinance formats major_holders differently over versions
            try:
                for idx, row in holders.iterrows():
                    shareholding.append({
                        "label": row[1] if len(row) > 1 else str(idx),
                        "value": float(row[0]) if isinstance(row[0], (int, float)) else 0
                    })
            except: pass

        # 3. Events
        events = []
        if calendar is not None:
            try:
                for key, val in calendar.items():
                    if isinstance(val, (datetime, pd.Timestamp)):
                        events.append({"event": key, "date": val.strftime('%Y-%m-%d')})
            except: pass

        return {
            "summary": {
                "name": info.get('longName', symbol),
                "sector": info.get('sector', 'N/A'),
                "industry": info.get('industry', 'N/A'),
                "market_cap": info.get('marketCap', 0),
                "current_price": info.get('currentPrice', 0),
                "day_high": info.get('dayHigh', 0),
                "day_low": info.get('dayLow', 0),
                "one_year_return": round(info.get('52WeekChange', 0) * 100, 2) if info.get('52WeekChange') else 0
            },
            "scores": {
                "quality": min(max(quality_score, 1), 5),
                "valuation": min(max(valuation_score, 1), 5),
                "financial": min(max(financial_score, 1), 5)
            },
            "shareholding": shareholding,
            "events": events,
            "technicals": technicals,
            "news": news[:5] if news else [],
            "insights": [
                f"{info.get('longName', symbol)} is in the {info.get('sector')} sector with a focus on {info.get('industry')}.",
                f"Management quality is considered { 'Excellent' if quality_score >= 4 else 'Good' if quality_score >= 2 else 'Stable' }.",
                f"Valuation is currently { 'Attractive' if valuation_score >= 4 else 'Fair' if valuation_score >= 2 else 'Expensive' }."
            ]
        }

    async def _get_historical_data_wrapper(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        """Wrapper for thread executor"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, self._get_historical_data, symbol, period)

    def _get_historical_data(self, symbol: str, period: str = "1y") -> pd.DataFrame:
        """Fetch historical data from Yahoo Finance"""
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        return df

    def _calculate_rsi(self, series, period=14):
        """Calculate Relative Strength Index manually"""
        delta = series.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))

    def _calculate_macd(self, series, fast=12, slow=26, signal=9):
        """Calculate MACD manually"""
        exp1 = series.ewm(span=fast, adjust=False).mean()
        exp2 = series.ewm(span=slow, adjust=False).mean()
        macd = exp1 - exp2
        exp3 = macd.ewm(span=signal, adjust=False).mean()
        return macd, exp3, macd - exp3

    async def get_technical_indicators(self, symbol: str) -> Dict:
        """Calculate technical indicators manually choosing to avoid pandas-ta conflicts"""
        yahoo_symbol = symbol.upper()
        if not (yahoo_symbol.endswith('.NS') or yahoo_symbol.endswith('.BO')):
            yahoo_symbol = f"{yahoo_symbol}.NS"

        df = await self._get_historical_data_wrapper(yahoo_symbol)
        
        if df.empty:
            return None

        # Manual Feature Engineering
        close = df['Close']
        df['RSI_14'] = self._calculate_rsi(close)
        macd, macd_signal, macd_hist = self._calculate_macd(close)
        df['MACD'] = macd
        df['MACD_Signal'] = macd_signal
        df['MACD_Hist'] = macd_hist
        
        # Bollinger Bands
        sma_20 = close.rolling(window=20).mean()
        std_20 = close.rolling(window=20).std()
        df['BB_Upper'] = sma_20 + (std_20 * 2)
        df['BB_Lower'] = sma_20 - (std_20 * 2)
        df['SMA_20'] = sma_20
        df['SMA_50'] = close.rolling(window=50).mean()

        latest = df.iloc[-1]
        
        return {
            "symbol": symbol,
            "rsi": round(float(latest.get("RSI_14", 50)), 2) if not np.isnan(latest["RSI_14"]) else 50.0,
            "macd": round(float(latest.get("MACD", 0)), 4),
            "macd_signal": round(float(latest.get("MACD_Signal", 0)), 4),
            "macd_hist": round(float(latest.get("MACD_Hist", 0)), 4),
            "bb_upper": round(float(latest.get("BB_Upper", 0)), 2),
            "bb_lower": round(float(latest.get("BB_Lower", 0)), 2),
            "sma_20": round(float(latest.get("SMA_20", 0)), 2),
            "sma_50": round(float(latest.get("SMA_50", 0)), 2),
            "current_price": round(float(latest["Close"]), 2),
            "trend": "bullish" if latest["SMA_20"] > latest["SMA_50"] else "bearish"
        }

    async def get_price_prediction(self, symbol: str) -> Dict:
        """Fast ARIMA-based trend prediction for prototype"""
        yahoo_symbol = symbol.upper()
        if not (yahoo_symbol.endswith('.NS') or yahoo_symbol.endswith('.BO')):
            yahoo_symbol = f"{yahoo_symbol}.NS"

        df = await self._get_historical_data_wrapper(yahoo_symbol, "6mo")
        
        if len(df) < 50:
            return None

        prices = df['Close'].values
        
        # Fit ARIMA model (1,1,1) for quick trend series
        try:
            model = ARIMA(prices, order=(1,1,1))
            model_fit = model.fit()
            forecast = model_fit.forecast(steps=5)
            
            return {
                "current": round(float(prices[-1]), 2),
                "forecast": [round(float(p), 2) for p in forecast],
                "confidence_score": 0.85 # Placeholder
            }
        except Exception as e:
            print(f"Prediction error for {symbol}: {e}")
            return None

    async def optimize_portfolio(self, symbols: List[str]) -> Dict:
        """Optimize portfolio weights using Modern Portfolio Theory (Mean-Variance)"""
        if not symbols:
            return None

        loop = asyncio.get_event_loop()
        
        # In a real scenario, we'd fetch historical returns for all symbols
        # For prototype, we simulate weights based on volatility
        data = {}
        for s in symbols:
            yahoo_symbol = s.upper() if (s.upper().endswith('.NS') or s.upper().endswith('.BO')) else f"{s.upper()}.NS"
            df = await loop.run_in_executor(executor, self._get_historical_data, yahoo_symbol, "1y")
            if not df.empty:
                data[s] = df['Close'].pct_change().dropna()

        if not data:
            return None

        returns_df = pd.DataFrame(data)
        avg_returns = returns_df.mean() * 252
        cov_matrix = returns_df.cov() * 252
        
        def portfolio_metrics(weights):
            ret = np.dot(weights, avg_returns)
            vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
            return ret, vol

        def neg_sharpe(weights):
            ret, vol = portfolio_metrics(weights)
            return -ret / vol if vol != 0 else 0

        num_assets = len(symbols)
        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = tuple((0, 1) for _ in range(num_assets))
        initial_guess = num_assets * [1. / num_assets]

        result = minimize(neg_sharpe, initial_guess, method='SLSQP', bounds=bounds, constraints=constraints)
        
        optimal_weights = {}
        for i, s in enumerate(symbols):
            optimal_weights[s] = round(float(result.x[i]), 4)

        ret, vol = portfolio_metrics(result.x)
        
        return {
            "weights": optimal_weights,
            "expected_return": round(float(ret), 4),
            "expected_volatility": round(float(vol), 4),
            "sharpe_ratio": round(float(ret / vol) if vol != 0 else 0, 4)
        }

    async def get_risk_metrics(self, symbol: str) -> Dict:
        """Calculate Value at Risk (VaR) and Volatility"""
        yahoo_symbol = symbol.upper() if (symbol.upper().endswith('.NS') or symbol.upper().endswith('.BO')) else f"{symbol.upper()}.NS"
        
        loop = asyncio.get_event_loop()
        df = await loop.run_in_executor(executor, self._get_historical_data, yahoo_symbol, "1y")
        
        if df.empty:
            return None

        returns = df['Close'].pct_change().dropna()
        volatility = returns.std() * np.sqrt(252) # Annualized
        
        # 95% Confidence VaR (Historical)
        var_95 = np.percentile(returns, 5)
        
        return {
            "volatility_annual": round(float(volatility), 4),
            "var_95": round(float(var_95), 4),
            "max_drawdown": round(float((df['Close'] / df['Close'].expanding().max() - 1).min()), 4)
        }
