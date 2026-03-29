import yfinance as yf
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from app.config import get_settings
import asyncio
from concurrent.futures import ThreadPoolExecutor

settings = get_settings()
executor = ThreadPoolExecutor(max_workers=4)


class MarketDataService:
    def __init__(self):
        self.cache = {}
        self.cache_duration = timedelta(minutes=2)

    def _is_cache_valid(self, key: str) -> bool:
        if key in self.cache:
            cached_time = self.cache[key].get("timestamp")
            if cached_time and datetime.utcnow() - cached_time < self.cache_duration:
                return True
        return False

    def _set_cache(self, key: str, data: dict):
        self.cache[key] = {"data": data, "timestamp": datetime.utcnow()}

    def _get_cache(self, key: str):
        return self.cache[key]["data"]

    def _fetch_stock_sync(self, symbol: str) -> dict:
        """Fetch stock data synchronously (runs in thread pool)"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            hist = ticker.history(period="2d")

            if hist.empty:
                return None

            current_price = hist['Close'].iloc[-1]
            prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
            change = current_price - prev_close
            change_pct = (change / prev_close) * 100 if prev_close else 0

            return {
                "price": round(float(current_price), 2),
                "prev_close": round(float(prev_close), 2),
                "change": round(float(change), 2),
                "change_pct": round(float(change_pct), 2),
                "volume": str(info.get("volume", "N/A")),
                "name": info.get("shortName", symbol),
                "sector": info.get("sector", "N/A"),
                "market_cap": info.get("marketCap", "N/A"),
                "day_high": round(float(info.get("dayHigh", 0)), 2),
                "day_low": round(float(info.get("dayLow", 0)), 2),
                "fifty_two_week_high": round(float(info.get("fiftyTwoWeekHigh", 0)), 2),
                "fifty_two_week_low": round(float(info.get("fiftyTwoWeekLow", 0)), 2),
            }
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
            return None

    def _fetch_index_sync(self, symbol: str) -> dict:
        """Fetch index data synchronously"""
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="2d")

            if hist.empty:
                return None

            current = hist['Close'].iloc[-1]
            prev = hist['Close'].iloc[-2] if len(hist) > 1 else current
            change = current - prev
            change_pct = (change / prev) * 100 if prev else 0

            return {
                "value": round(float(current), 2),
                "change": round(float(change), 2),
                "change_pct": round(float(change_pct), 2),
            }
        except Exception as e:
            print(f"Error fetching index {symbol}: {e}")
            return None

    async def get_stock_quote(self, symbol: str) -> Optional[Dict]:
        """Fetch real-time stock quote from Yahoo Finance"""
        cache_key = f"stock_{symbol}"
        if self._is_cache_valid(cache_key):
            return self._get_cache(cache_key)

        # Add .NS suffix for NSE stocks if not present
        yahoo_symbol = symbol.upper()
        if not yahoo_symbol.endswith(('.NS', '.BO')):
            yahoo_symbol = f"{yahoo_symbol}.NS"

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, self._fetch_stock_sync, yahoo_symbol)

        if result:
            self._set_cache(cache_key, result)
            return result

        # Fallback: try without suffix
        result = await loop.run_in_executor(executor, self._fetch_stock_sync, symbol.upper())
        if result:
            self._set_cache(cache_key, result)
        return result

    async def get_market_indices(self) -> Dict:
        """Get major Indian market indices from Yahoo Finance"""
        cache_key = "indices"
        if self._is_cache_valid(cache_key):
            return self._get_cache(cache_key)

        index_symbols = {
            "NIFTY_50": "^NSEI",
            "SENSEX": "^BSESN",
            "NIFTY_BANK": "^NSEBANK",
        }

        loop = asyncio.get_event_loop()
        
        # Parallel fetch for indices
        tasks = []
        for name, symbol in index_symbols.items():
            tasks.append(loop.run_in_executor(executor, self._fetch_index_sync, symbol))
        
        results_list = await asyncio.gather(*tasks)
        
        result = {}
        for (name, _), data in zip(index_symbols.items(), results_list):
            if data:
                result[name] = data

        result["last_updated"] = datetime.utcnow().isoformat()
        self._set_cache(cache_key, result)
        return result

    async def get_trending_stocks(self) -> list:
        """Get trending Indian stocks with real-time data"""
        cache_key = "trending"
        if self._is_cache_valid(cache_key):
            return self._get_cache(cache_key)

        trending_symbols = [
            {"symbol": "RELIANCE.NS", "display": "RELIANCE"},
            {"symbol": "TCS.NS", "display": "TCS"},
            {"symbol": "INFY.NS", "display": "INFY"},
            {"symbol": "HDFCBANK.NS", "display": "HDFCBANK"},
            {"symbol": "ICICIBANK.NS", "display": "ICICIBANK"},
            {"symbol": "BHARTIARTL.NS", "display": "BHARTIARTL"},
            {"symbol": "SBIN.NS", "display": "SBIN"},
            {"symbol": "ITC.NS", "display": "ITC"},
            {"symbol": "LT.NS", "display": "LT"},
            {"symbol": "WIPRO.NS", "display": "WIPRO"},
        ]

        loop = asyncio.get_event_loop()
        
        # Parallel fetch for stocks
        tasks = []
        for stock_info in trending_symbols:
            tasks.append(loop.run_in_executor(executor, self._fetch_stock_sync, stock_info["symbol"]))
        
        results_list = await asyncio.gather(*tasks)
        
        final_results = []
        for stock_info, data in zip(trending_symbols, results_list):
            if data:
                final_results.append({
                    "symbol": stock_info["display"],
                    "name": data.get("name", stock_info["display"]),
                    "sector": data.get("sector", "N/A"),
                    "price": data.get("price", 0),
                    "change": data.get("change_pct", 0),
                    "volume": data.get("volume", "N/A"),
                    "day_high": data.get("day_high", 0),
                    "day_low": data.get("day_low", 0),
                })

        self._set_cache(cache_key, final_results)
        return final_results

    async def search_instruments(self, query: str) -> list:
        """Search for stocks/funds on NSE"""
        # Common Indian stocks/funds for search
        all_instruments = [
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "INFY", "name": "Infosys Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "SBIN", "name": "State Bank of India", "type": "stock", "exchange": "NSE"},
            {"symbol": "ITC", "name": "ITC Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "LT", "name": "Larsen & Toubro Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "KOTAKBANK", "name": "Kotak Mahindra Bank Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "WIPRO", "name": "Wipro Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "AXISBANK", "name": "Axis Bank Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "MARUTI", "name": "Maruti Suzuki India Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "ADANIENT", "name": "Adani Enterprises Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "SUNPHARMA", "name": "Sun Pharmaceutical Industries Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "TATASTEEL", "name": "Tata Steel Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "HCLTECH", "name": "HCL Technologies Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "ASIANPAINT", "name": "Asian Paints Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "TITAN", "name": "Titan Company Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "ULTRACEMCO", "name": "UltraTech Cement Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "NESTLEIND", "name": "Nestle India Ltd", "type": "stock", "exchange": "NSE"},
            {"symbol": "POWERGRID", "name": "Power Grid Corporation of India Ltd", "type": "stock", "exchange": "NSE"},
        ]

        q = query.lower()
        return [
            i for i in all_instruments
            if q in i["name"].lower() or q in i["symbol"].lower()
        ]
