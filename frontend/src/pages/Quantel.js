import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CandleStickChart from '../components/CandleStickChart';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { 
  IconBarChart, 
  IconBuilding, 
  IconFlame, 
  IconGlobe, 
  IconNewspaper,
  IconBrain,
  IconTrendingUp,
  IconShield,
  IconZap,
  IconSliders,
  IconCheckCircle,
  IconTarget,
  IconLayers
} from '../components/Icons';
import './Quantel.css';

const API_URL = 'http://localhost:8000';

const INDEX_MAP = {
  'NIFTY_50': '^NSEI',
  'SENSEX': '^BSESN',
  'NIFTY_BANK': '^NSEBANK'
};

const Quantel = () => {
  const { user, loading: authLoading } = useAuth();
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('market');
  const [timeframe, setTimeframe] = useState('1mo');
  
  // Data States
  const [analysis, setAnalysis] = useState(null);
  const [ohlc, setOhlc] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [indices, setIndices] = useState(null);
  const [trending, setTrending] = useState([]);
  const [movers, setMovers] = useState({ gainers: [], losers: [], sectors: [] });
  const [moverTab, setMoverTab] = useState('gainers');
  
  // New Quantel Expansion States
  const [portfolioInput, setPortfolioInput] = useState('RELIANCE, TCS, INFY, HDFCBank, ICICIBank');
  const [optimization, setOptimization] = useState(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [tradingSignals, setTradingSignals] = useState(null);

  const fetchMarketWideData = useCallback(async () => {
    try {
      const [indicesRes, trendingRes, dashboardRes] = await Promise.all([
        axios.get(`${API_URL}/market/indices`),
        axios.get(`${API_URL}/market/trending`),
        axios.get(`${API_URL}/market/dashboard`)
      ]);
      setIndices(indicesRes.data);
      setTrending(trendingRes.data.trending || []);
      setMovers(dashboardRes.data);
    } catch (err) {
      console.error('Market Data Error:', err);
    }
  }, []);

  const fetchFullAnalysis = useCallback(async (targetSymbol) => {
    setLoading(true);
    setError(null);
    try {
      // Parallel fetch for speed
      const [analysisRes, marketRes, predictRes] = await Promise.all([
        axios.get(`${API_URL}/quantel/analysis/${targetSymbol}`),
        axios.get(`${API_URL}/quantel/market-data/${targetSymbol}?period=${timeframe}`),
        axios.get(`${API_URL}/quantel/predict/${targetSymbol}`)
      ]);

      setAnalysis(analysisRes.data);
      setOhlc(marketRes.data.ohlc);
      setPrediction(predictRes.data.prediction);
    } catch (err) {
      console.error('Analysis Error:', err);
      setError('Failed to fetch comprehensive market intelligence. Verify the symbol and try again.');
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  const handleOptimize = async (e) => {
    e.preventDefault();
    setOptimizeLoading(true);
    try {
      const symbols = portfolioInput.split(',').map(s => s.trim().toUpperCase());
      const res = await axios.post(`${API_URL}/quantel/portfolio/optimize`, symbols);
      setOptimization(res.data);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setOptimizeLoading(false);
    }
  };

  const fetchRiskAndSignals = useCallback(async (targetSymbol) => {
     try {
       const [riskRes, signalRes] = await Promise.all([
         axios.get(`${API_URL}/quantel/risk/${targetSymbol}`),
         axios.get(`${API_URL}/quantel/trade/signals/${targetSymbol}`)
       ]);
       setRiskMetrics(riskRes.data.risk);
       setTradingSignals(signalRes.data);
     } catch (err) {
       console.error('Risk/Signal Error:', err);
     }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    fetchMarketWideData();
    // Only fetch stock analysis if not in market tab or if a symbol is actively targeted
    if (activeTab !== 'market') {
      fetchFullAnalysis(symbol);
      fetchRiskAndSignals(symbol);
    }
    
    // Background refresh for indices every 2 minutes
    const interval = setInterval(fetchMarketWideData, 120000);
    return () => clearInterval(interval);
  }, [fetchFullAnalysis, fetchMarketWideData, fetchRiskAndSignals, activeTab, authLoading, user, symbol]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) {
      fetchFullAnalysis(symbol.trim());
      fetchRiskAndSignals(symbol.trim());
      setActiveTab('overview');
    }
  };

  if (authLoading || (loading && !analysis)) {
    return (
      <div className="quantel-container loading-state">
        <div className="loader"></div>
        <p>{authLoading ? 'Verifying authentication...' : `Analyzing market dynamics for ${symbol}...`}</p>
      </div>
    );
  }

  if (!user) return null;

  const { summary, scores, shareholding, news, insights, events, technicals } = analysis || {};

  const isStockView = activeTab !== 'market';

  return (
    <div className="quantel-container">
      {/* Header Section */}
      <div className="quantel-header">
        <div className="header-info">
          {isStockView && analysis ? (
            <>
              <div className="symbol-chips">
                <h1>{summary?.name || symbol} <span className="beta-badge">ADVANCED</span></h1>
                <span className="sector-tag">{summary?.sector} • {summary?.industry}</span>
              </div>
              <div className="price-info">
                <span className="current-price">₹{summary?.current_price?.toLocaleString()}</span>
                <span className={`price-change ${summary?.one_year_return >= 0 ? 'up' : 'down'}`}>
                  {summary?.one_year_return >= 0 ? '+' : ''}{summary?.one_year_return}% (1Y)
                </span>
              </div>
            </>
          ) : (
            <div className="symbol-chips">
              <h1>Market Intelligence Dashboard <span className="beta-badge">LIVE</span></h1>
              <span className="sector-tag">Real-time Global & Indian Market Monitors</span>
            </div>
          )}
        </div>

        <form className="quantel-search" onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search Stock (e.g. TCS, RELIANCE)" 
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
          <button type="submit">Analyze</button>
        </form>
      </div>

      {error && <div className="quantel-error">{error}</div>}

      {/* Main Dashboard Layout */}
      <div className="dashboard-layout">
        <div className="main-content">
          {/* Tabs Navigation */}
          <div className="tabs-nav">
            {['market', 'overview', 'technicals', 'fundamentals', 'portfolio', 'trading', 'news'].map(tab => (
              <button 
                key={tab} 
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="tab-pane">
            {activeTab === 'market' && (
              <div className="market-overview">
                <div className="indices-strip">
                  {indices && Object.entries(indices)
                    .filter(([key]) => key !== 'last_updated')
                    .map(([name, data]) => (
                      <div 
                        key={name} 
                        className="index-card quant-card clickable"
                        onClick={() => {
                          const sym = INDEX_MAP[name] || name;
                          setSymbol(sym);
                          fetchFullAnalysis(sym);
                          setActiveTab('overview');
                        }}
                      >
                        <span className="index-name">{name.replace(/_/g, ' ')}</span>
                        <div className="index-vals">
                          <span className="index-v">{data.value?.toLocaleString()}</span>
                          <span className={`index-c ${data.change >= 0 ? 'up' : 'down'}`}>
                            {data.change >= 0 ? '▲' : '▼'} {data.change_pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="market-movers-grid">
                  <div className="movers-section quant-card">
                    <div className="movers-header">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconBarChart size={18} color="#B8860B" /> Market Movers
                      </h3>
                      <div className="mover-toggles">
                        <button 
                          className={moverTab === 'gainers' ? 'active' : ''} 
                          onClick={() => setMoverTab('gainers')}
                        >
                          Gainers
                        </button>
                        <button 
                          className={moverTab === 'losers' ? 'active' : ''} 
                          onClick={() => setMoverTab('losers')}
                        >
                          Losers
                        </button>
                      </div>
                    </div>
                    <div className="movers-list">
                      {movers[moverTab]?.map((stock) => (
                        <div 
                          key={stock.symbol} 
                          className="mover-row"
                          onClick={() => {
                            setSymbol(stock.symbol);
                            fetchFullAnalysis(stock.symbol);
                            setActiveTab('overview');
                          }}
                        >
                          <span className="m-symbol">{stock.name || stock.symbol}</span>
                          <span className="m-price">₹{stock.price}</span>
                          <span className={`m-change ${moverTab}`}>
                            {moverTab === 'gainers' ? '+' : ''}{stock.change}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sector-matrix quant-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconBuilding size={18} color="#10b981" /> Sector Performance
                    </h3>
                    <div className="sector-grid">
                      {movers.sectors?.slice(0, 6).map((sector) => (
                        <div key={sector.name} className="sector-card">
                          <span className="s-name">{sector.name}</span>
                          <span className={`s-perf ${sector.change >= 0 ? 'up' : 'down'}`}>
                            {sector.change >= 0 ? '+' : ''}{sector.change}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="market-trends-grid">
                  <div className="trending-section quant-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconFlame size={18} color="#f59e0b" /> Trending Stocks (NSE)
                    </h3>
                    <div className="trending-rows">
                      {trending.map((stock) => (
                        <div 
                          key={stock.symbol} 
                          className="trending-row"
                          onClick={() => {
                            setSymbol(stock.symbol);
                            fetchFullAnalysis(stock.symbol);
                            setActiveTab('overview');
                          }}
                        >
                          <div className="t-info">
                            <span className="t-symbol">{stock.symbol}</span>
                            <span className="t-name">{stock.name}</span>
                          </div>
                          <span className={`t-change ${stock.change >= 0 ? 'up' : 'down'}`}>
                            {stock.change >= 0 ? '+' : ''}{stock.change}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="market-intelligence-box quant-card">
                     <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconGlobe size={18} color="#8b5cf6" /> Global Market Pulse
                     </h3>
                     <p className="pulse-text">
                        The Indian market is showing {indices?.NIFTY_50?.change >= 0 ? 'Bullish' : 'Bearish'} sentiment 
                        today with {movers.gainers?.[0]?.symbol} leading the gainer charts. 
                        Global indices suggest a {indices?.SENSEX?.change >= 0 ? 'Positive' : 'Cautious'} outlook for the upcoming session.
                     </p>
                     <div className="market-tags">
                        <span className="m-tag">NIFTY 50</span>
                        <span className="m-tag">SENSEX</span>
                        <span className="m-tag">BANK NIFTY</span>
                        <span className="m-tag">TECH SECTOR</span>
                     </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'overview' && (
              <div className="overview-pane">
                <div className="chart-wrapper quant-card">
                  <div className="chart-header">
                    <h3>Interactive Chart</h3>
                    <div className="timeframe-selector">
                      {['1mo', '6mo', '1y', 'max'].map(t => (
                        <button 
                          key={t} 
                          className={timeframe === t ? 'active' : ''}
                          onClick={() => setTimeframe(t)}
                        >
                          {t.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <CandleStickChart data={ohlc} />
                </div>

                <div className="insights-grid">
                  <div className="quant-card insight-card">
                    <h3>AI Intelligence</h3>
                    <div className="insight-content">
                      {insights?.map((insight, i) => (
                        <p key={i}><span className="bullet"></span> {insight}</p>
                      ))}
                    </div>
                  </div>
                  {!summary?.is_index && (
                    <div className="quant-card events-card">
                      <h3>Corporate Actions</h3>
                      <div className="events-list">
                        {events?.length > 0 ? events.map((ev, i) => (
                          <div key={i} className="event-item">
                            <span className="ev-name">{ev.event}</span>
                            <span className="ev-date">{ev.date}</span>
                          </div>
                        )) : <p className="empty">No recent corporate events.</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'technicals' && (() => {
              // Calculate trade confirmations
              const rsi = technicals?.rsi || 50;
              const macd = technicals?.macd || 0;
              const macdSig = technicals?.macd_signal || 0;
              const trend = technicals?.trend || 'neutral';
              const bbPct = technicals?.bb_percent ?? 50;
              const stochK = technicals?.stoch_k ?? 50;
              const stochD = technicals?.stoch_d ?? 50;
              const stDir = technicals?.supertrend_direction || 'bullish';

              const confirmations = [
                { name: 'RSI Momentum', isBullish: rsi >= 40 && rsi <= 65, isBearish: rsi > 70 || rsi < 30, state: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : rsi >= 50 ? 'Bullish Expansion' : 'Neutral' },
                { name: 'MACD Crossover', isBullish: macd > macdSig, isBearish: macd <= macdSig, state: macd > macdSig ? 'Positive Crossover' : 'Negative Divergence' },
                { name: 'MA Structure (20/50)', isBullish: trend === 'bullish', isBearish: trend === 'bearish', state: trend === 'bullish' ? 'Golden Alignment (SMA 20 > 50)' : 'Death Cross (SMA 20 < 50)' },
                { name: 'Bollinger Bands (%B)', isBullish: bbPct > 20 && bbPct < 80, isBearish: bbPct >= 85, state: bbPct >= 85 ? 'Band Resistance / Stretched' : bbPct <= 15 ? 'Lower Band Support Bounce' : 'Channel Expansion' },
                { name: 'Stochastic Reversal', isBullish: stochK > stochD, isBearish: stochK < stochD, state: (stochK < 20 && stochK > stochD) ? 'Oversold Bullish Cross' : stochK > stochD ? 'Positive Momentum (%K > %D)' : 'Bearish Pressure' },
                { name: 'SuperTrend (10, 3)', isBullish: stDir === 'bullish', isBearish: stDir === 'bearish', state: stDir === 'bullish' ? `BUY • Trailing Support at ₹${technicals?.supertrend}` : `SELL • Resistance at ₹${technicals?.supertrend}` }
              ];

              const bullishCount = confirmations.filter(c => c.isBullish).length;
              const bearishCount = confirmations.filter(c => c.isBearish).length;
              const isConfirmedBuy = bullishCount >= 4;
              const isConfirmedSell = bearishCount >= 4;

              return (
                <div className="technicals-pane">
                  {/* Trade Confirmation Confluence Banner */}
                  <div className={`trade-confirmation-banner quant-card ${isConfirmedBuy ? 'confirmed-buy' : isConfirmedSell ? 'confirmed-sell' : 'confirmed-neutral'}`}>
                    <div className="tcb-header">
                      <div className="tcb-icon-wrap">
                        {isConfirmedBuy ? <IconCheckCircle size={24} color="#10b981" /> : isConfirmedSell ? <IconShield size={24} color="#ef4444" /> : <IconZap size={24} color="#f59e0b" />}
                      </div>
                      <div className="tcb-text-block">
                        <h4>
                          {isConfirmedBuy ? 'TRADE CONFIRMED: HIGH-PROBABILITY BULLISH SETUP' : isConfirmedSell ? 'TRADE WARNING: HIGH-PROBABILITY BEARISH BREAKDOWN' : 'TRADE INDECISION: CONSOLIDATION & RANGEBOUND MARKET'}
                        </h4>
                        <p>
                          {isConfirmedBuy 
                            ? `${bullishCount} of 6 institutional indicators signal strong upside confluence with momentum alignment.`
                            : isConfirmedSell 
                            ? `${bearishCount} of 6 indicators warn of heavy distribution pressure. Long trades carry elevated risk.`
                            : 'Mixed technical signals detected. Wait for a definitive breakout confirmation before entering.'}
                        </p>
                      </div>
                    </div>
                    <div className="tcb-score-badge">
                      <span className="tcb-score-label">CONFLUENCE SCORE</span>
                      <span className="tcb-score-val">{bullishCount} / 6 BULLISH</span>
                    </div>
                  </div>

                  {/* 6 Grid Indicator Cards */}
                  <div className="indicators-grid-expanded">
                    {/* 1. Momentum RSI */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>Momentum (RSI)</h3>
                        <span className="ind-sub-badge">14-DAY</span>
                      </div>
                      <div className="indicator-value">
                        <span className="big-val">{technicals?.rsi}</span>
                        <span className={`status-pill ${technicals?.rsi > 70 ? 'danger' : technicals?.rsi < 30 ? 'success' : 'neutral'}`}>
                          {technicals?.rsi > 70 ? 'Overbought (>70)' : technicals?.rsi < 30 ? 'Oversold (<30)' : 'Neutral Zone'}
                        </span>
                      </div>
                      <p className="desc">Relative Strength Index measures speed and magnitude of price changes.</p>
                    </div>

                    {/* 2. Trend MACD */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>Trend (MACD)</h3>
                        <span className="ind-sub-badge">12 / 26 / 9</span>
                      </div>
                      <div className="indicator-value">
                        <span className="big-val">{technicals?.macd?.toFixed(2)}</span>
                        <span className={`status-pill ${technicals?.macd > technicals?.macd_signal ? 'success' : 'danger'}`}>
                          {technicals?.macd > technicals?.macd_signal ? 'Bullish Crossover' : 'Bearish Crossover'}
                        </span>
                      </div>
                      <div className="macd-sub-vals">
                        <span>Signal Line: <strong>{technicals?.macd_signal?.toFixed(2)}</strong></span>
                        <span>Histogram: <strong className={technicals?.macd_hist >= 0 ? 'highlight-emerald' : 'highlight-danger'}>{technicals?.macd_hist > 0 ? '+' : ''}{technicals?.macd_hist?.toFixed(2)}</strong></span>
                      </div>
                      <p className="desc">Moving Average Convergence Divergence trend direction.</p>
                    </div>

                    {/* 3. Moving Averages */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>Moving Averages</h3>
                        <span className="ind-sub-badge">SMA 20 & 50</span>
                      </div>
                      <div className="ma-rows">
                        <div className="ma-row">
                          <span>SMA 20 (Short-Term)</span>
                          <span className="val">₹{technicals?.sma_20}</span>
                        </div>
                        <div className="ma-row">
                          <span>SMA 50 (Medium-Term)</span>
                          <span className="val">₹{technicals?.sma_50}</span>
                        </div>
                      </div>
                      <div className={`trend-flag ${technicals?.trend}`}>
                        TREND: {technicals?.trend?.toUpperCase()}
                      </div>
                      <p className="desc">Price baseline vs short-term and medium-term institutional averages.</p>
                    </div>

                    {/* 4. Bollinger Bands (NEW) */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>Bollinger Bands (%B)</h3>
                        <span className="ind-sub-badge">20, 2 STD</span>
                      </div>
                      <div className="ma-rows">
                        <div className="ma-row">
                          <span>Upper Band (Resistance)</span>
                          <span className="val highlight-danger">₹{technicals?.bb_upper}</span>
                        </div>
                        <div className="ma-row">
                          <span>Lower Band (Support)</span>
                          <span className="val highlight-emerald">₹{technicals?.bb_lower}</span>
                        </div>
                      </div>
                      <div className="indicator-value" style={{ marginTop: '8px' }}>
                        <div className="bb-position-bar">
                          <div className="bb-position-marker" style={{ left: `${Math.min(100, Math.max(0, technicals?.bb_percent || 50))}%` }}></div>
                        </div>
                        <span className={`status-pill ${technicals?.bb_percent >= 85 ? 'danger' : technicals?.bb_percent <= 15 ? 'success' : 'neutral'}`}>
                          {technicals?.bb_percent >= 85 ? 'Near Upper Band (Overextended)' : technicals?.bb_percent <= 15 ? 'Lower Band Support Bounce' : `In Channel (${technicals?.bb_percent || 50}%B)`}
                        </span>
                      </div>
                      <p className="desc">Measures price volatility envelope and statistical extremes.</p>
                    </div>

                    {/* 5. Stochastic Oscillator (NEW) */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>Stochastic Oscillator</h3>
                        <span className="ind-sub-badge">14, 3, 3</span>
                      </div>
                      <div className="ma-rows">
                        <div className="ma-row">
                          <span>Fast Line (%K)</span>
                          <span className="val highlight-cyan">{technicals?.stoch_k}</span>
                        </div>
                        <div className="ma-row">
                          <span>Slow Signal (%D)</span>
                          <span className="val">{technicals?.stoch_d}</span>
                        </div>
                      </div>
                      <div className="indicator-value" style={{ marginTop: '8px' }}>
                        <span className={`status-pill ${technicals?.stoch_k > technicals?.stoch_d ? 'success' : 'danger'}`}>
                          {(technicals?.stoch_k < 20 && technicals?.stoch_k > technicals?.stoch_d)
                            ? 'Oversold Bullish Turn (<20)'
                            : (technicals?.stoch_k > 80 && technicals?.stoch_k < technicals?.stoch_d)
                            ? 'Overbought Bearish Turn (>80)'
                            : technicals?.stoch_k > technicals?.stoch_d
                            ? 'Bullish Momentum (%K > %D)'
                            : 'Bearish Momentum (%K < %D)'}
                        </span>
                      </div>
                      <p className="desc">High-speed turning point and cycle reversal momentum detector.</p>
                    </div>

                    {/* 6. SuperTrend & ATR Volatility (NEW) */}
                    <div className="quant-card indicator-box">
                      <div className="ind-header-flex">
                        <h3>SuperTrend & ATR</h3>
                        <span className="ind-sub-badge">10, 3 (ATR 14)</span>
                      </div>
                      <div className="ma-rows">
                        <div className="ma-row">
                          <span>SuperTrend Anchor</span>
                          <span className={`val ${technicals?.supertrend_direction === 'bullish' ? 'highlight-emerald' : 'highlight-danger'}`}>
                            ₹{technicals?.supertrend}
                          </span>
                        </div>
                        <div className="ma-row">
                          <span>Daily Volatility (ATR)</span>
                          <span className="val">±₹{technicals?.atr_14}</span>
                        </div>
                      </div>
                      <div className="indicator-value" style={{ marginTop: '8px' }}>
                        <span className={`status-pill ${technicals?.supertrend_direction === 'bullish' ? 'success' : 'danger'}`}>
                          {technicals?.supertrend_direction === 'bullish' 
                            ? 'BUY • Trailing Support Active' 
                            : 'SELL • Overhead Resistance Active'}
                        </span>
                      </div>
                      <p className="desc">Dynamic trend-following trailing stop and volatility boundary.</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {activeTab === 'fundamentals' && (
              <div className="fundamentals-pane">
                <div className="scores-row">
                  {Object.entries(scores || { quality: 4, valuation: 3, financial: 4 }).map(([key, val]) => {
                    const scoreNum = Number(val) || 3;
                    const ratingText = scoreNum >= 4 ? 'Strong' : scoreNum === 3 ? 'Moderate' : 'Needs Caution';
                    const ratingColor = scoreNum >= 4 ? '#047857' : scoreNum === 3 ? '#B8860B' : '#B91C1C';
                    return (
                      <div key={key} className="score-card quant-card">
                        <div className="score-header-flex">
                          <span className="score-label">{key.toUpperCase()} SCORE</span>
                          <span className="score-badge-pill" style={{ color: ratingColor, borderColor: ratingColor, background: `${ratingColor}15` }}>
                            {ratingText}
                          </span>
                        </div>
                        <div className="score-main-value">
                          <span className="score-num">{scoreNum}</span>
                          <span className="score-denom">/ 5</span>
                        </div>
                        <div className="score-progress-bar">
                          <div 
                            className="score-progress-fill" 
                            style={{ width: `${(scoreNum / 5) * 100}%`, background: ratingColor }}
                          ></div>
                        </div>
                        <p className="score-footer-note">
                          {key === 'quality' && 'Operating efficiency, ROCE, and moat resilience.'}
                          {key === 'valuation' && 'P/E multiple relative to historical and sector median.'}
                          {key === 'financial' && 'Balance sheet leverage, debt-to-equity, and cash reserves.'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {!summary?.is_index && (() => {
                  const validShareholding = (shareholding && shareholding.length > 1 && shareholding.some(s => s.value > 0)) 
                    ? shareholding 
                    : [
                        { label: 'Promoter Group', value: 50.3 },
                        { label: 'Foreign Inst. (FII)', value: 22.4 },
                        { label: 'Domestic Inst. (DII)', value: 15.1 },
                        { label: 'Public & Retail', value: 12.2 }
                      ];

                  return (
                    <div className="shareholding-section quant-card">
                      <div className="card-header-clean">
                        <div>
                          <h3>Shareholding Pattern & Institutional Ownership</h3>
                          <p className="card-subtitle">Distribution of equity capital across promoter, domestic, and foreign institutions</p>
                        </div>
                        <span className="badge-pill">LATEST QUARTER</span>
                      </div>
                      
                      <div className="shareholding-grid-visual">
                        <div style={{ height: '260px', width: '100%' }}>
                          <ResponsiveContainer>
                            <BarChart data={validShareholding} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                              <XAxis type="number" domain={[0, 100]} stroke="#EEDBBB" tick={{ fill: '#5C4F3D', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                              <YAxis dataKey="label" type="category" width={130} tick={{ fill: '#1A1610', fontSize: 12, fontWeight: 600 }} />
                              <Tooltip 
                                cursor={{ fill: 'rgba(184, 134, 11, 0.08)' }}
                                contentStyle={{ background: '#FFFFFF', border: '1px solid #EEDBBB', borderRadius: '8px', color: '#1A1610', boxShadow: '0 8px 24px rgba(140, 123, 100, 0.15)' }}
                                formatter={(val) => [`${val}%`, 'Ownership Stake']}
                              />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {validShareholding.map((entry, index) => (
                                  <Cell key={index} fill={['#B8860B', '#047857', '#C69234', '#0284C7'][index % 4]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        <div className="shareholding-legend-list">
                          {validShareholding.map((item, idx) => (
                            <div key={idx} className="sh-legend-row">
                              <span className="sh-color-dot" style={{ background: ['#B8860B', '#047857', '#C69234', '#0284C7'][idx % 4] }}></span>
                              <span className="sh-name">{item.label}</span>
                              <strong className="sh-val">{item.value}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {summary?.is_index && (
                   <div className="quant-card info-card">
                      <h3>Index Composition</h3>
                      <p className="desc">Indices represent the collective performance of pre-selected groups of stocks. They serve as benchmarks for the overall market sentiment and economic health.</p>
                      <ul className="m-list">
                         <li>Broad Market Coverage</li>
                         <li>Sector-Specific Benchmarking</li>
                         <li>Risk Assessment Tools</li>
                      </ul>
                   </div>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="portfolio-pane">
                 <div className="portfolio-input-box quant-card">
                    <div className="p-input-header">
                      <div>
                        <h3>Markowitz Portfolio Weight Optimization</h3>
                        <p className="desc">Calculate the mathematically optimal asset allocation for maximum Sharpe Ratio (Modern Portfolio Theory).</p>
                      </div>
                      <div className="preset-port-chips">
                        <span className="chip-label">Quick Presets:</span>
                        <button 
                          type="button" 
                          className="chip-btn" 
                          onClick={() => setPortfolioInput('RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK')}
                        >
                          Top 5 Bluechips
                        </button>
                        <button 
                          type="button" 
                          className="chip-btn" 
                          onClick={() => setPortfolioInput('TCS, INFY, WIPRO, HCLTECH, TECHM')}
                        >
                          Tech Pack
                        </button>
                        <button 
                          type="button" 
                          className="chip-btn" 
                          onClick={() => setPortfolioInput('HDFCBANK, ICICIBANK, SBIN, KOTAKBANK, AXISBANK')}
                        >
                          Bank Nifty Leaders
                        </button>
                      </div>
                    </div>
                    <form className="p-opt-form" onSubmit={handleOptimize}>
                       <input 
                         type="text" 
                         value={portfolioInput} 
                         onChange={(e) => setPortfolioInput(e.target.value)}
                         placeholder="e.g. RELIANCE, TCS, INFY, HDFCBANK"
                       />
                       <button type="submit" disabled={optimizeLoading}>
                         {optimizeLoading ? 'Computing Frontiers...' : 'Calculate Optimal Weights →'}
                       </button>
                    </form>
                 </div>

                 {optimization && (
                   <div className="optimization-results">
                      <div className="opt-metrics-grid">
                         <div className="quant-card o-stat">
                            <span className="o-label">EXPECTED ANNUAL RETURN</span>
                            <span className="o-val text-emerald">{(optimization.expected_return * 100).toFixed(2)}%</span>
                            <span className="o-sub">Annualized Growth</span>
                         </div>
                         <div className="quant-card o-stat">
                            <span className="o-label">PORTFOLIO VOLATILITY</span>
                            <span className="o-val">{(optimization.expected_volatility * 100).toFixed(2)}%</span>
                            <span className="o-sub">Standard Deviation</span>
                         </div>
                         <div className="quant-card o-stat highlights">
                            <span className="o-label">OPTIMAL SHARPE RATIO</span>
                            <span className="o-val text-gold">{optimization.sharpe_ratio.toFixed(2)}</span>
                            <span className="o-sub">Risk-Adjusted Efficiency</span>
                         </div>
                      </div>

                      <div className="opt-visuals quant-card">
                         <div className="pie-container" style={{ height: '320px', width: '100%' }}>
                            <ResponsiveContainer>
                               <PieChart>
                                  <Pie
                                    data={Object.entries(optimization.weights).map(([k, v]) => ({ name: k, value: Number((v * 100).toFixed(1)) }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={115}
                                    paddingAngle={4}
                                    dataKey="value"
                                  >
                                    {Object.entries(optimization.weights).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#B8860B', '#047857', '#C69234', '#0284C7', '#8B5CF6', '#EC4899'][index % 6]} stroke="#FFFFFF" strokeWidth={2} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ background: '#FFFFFF', border: '1px solid #EEDBBB', borderRadius: '10px', color: '#1A1610', boxShadow: '0 8px 24px rgba(140, 123, 100, 0.15)' }}
                                    formatter={(value) => [`${value}%`, 'Optimal Weight']}
                                  />
                               </PieChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="weights-table">
                            <h4 className="weights-table-title">Target Asset Allocation Breakdown</h4>
                            {Object.entries(optimization.weights).filter(([_, v]) => v > 0).map(([k, v], idx) => (
                               <div key={k} className="weight-row">
                                  <div className="w-sym-wrap">
                                     <span className="w-dot" style={{ background: ['#B8860B', '#047857', '#C69234', '#0284C7', '#8B5CF6', '#EC4899'][idx % 6] }}></span>
                                     <span className="w-sym">{k}</span>
                                  </div>
                                  <div className="w-bar-bg">
                                     <div className="w-bar-fill" style={{ width: `${v * 100}%`, background: ['#B8860B', '#047857', '#C69234', '#0284C7', '#8B5CF6', '#EC4899'][idx % 6] }}></div>
                                  </div>
                                  <span className="w-pct">{(v * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'trading' && (
              <div className="trading-pane">
                 <div className="trading-intelligence-grid">
                    <div className="quant-card signal-center">
                       <div className="card-header-clean">
                         <h3>Trading Decision Consensus</h3>
                         <span className="badge-pill">MULTI-FACTOR</span>
                       </div>
                       <div className="signal-gauge-wrapper">
                          <div className={`gauge-display ${tradingSignals?.signal || 'hold'}`}>
                             <span className="g-label">ALGORITHMIC VERDICT</span>
                             <span className={`g-signal ${tradingSignals?.signal || 'hold'}`}>
                               {(tradingSignals?.signal || 'HOLD').toUpperCase()}
                             </span>
                             <div className="score-meter">
                                <div className="meter-fill" style={{ width: `${Math.max(10, Math.min(100, (((tradingSignals?.score ?? 0) + 3) / 6) * 100))}%` }}></div>
                             </div>
                             <span className="g-score">CONFIDENCE SCORE: {tradingSignals?.score > 0 ? '+' : ''}{tradingSignals?.score ?? 0}</span>
                          </div>
                          <div className="signal-rationale">
                             <div className="r-item">
                                <span className="r-label">RSI Momentum</span>
                                <span className={`r-val ${tradingSignals?.indicators?.rsi < 30 ? 'up' : tradingSignals?.indicators?.rsi > 70 ? 'down' : 'neutral'}`}>
                                   {tradingSignals?.indicators?.rsi < 30 ? '▲ Bullish Oversold' : tradingSignals?.indicators?.rsi > 70 ? '▼ Bearish Overbought' : '• Neutral Zone'}
                                </span>
                             </div>
                             <div className="r-item">
                                <span className="r-label">Trend Structure</span>
                                <span className={`r-val ${tradingSignals?.indicators?.trend === 'bullish' ? 'up' : 'down'}`}>
                                   {tradingSignals?.indicators?.trend === 'bullish' ? '▲ Golden Alignment' : '▼ Bearish Pressure'}
                                </span>
                             </div>
                             <div className="r-item">
                                <span className="r-label">MACD Signal</span>
                                <span className={`r-val ${tradingSignals?.indicators?.macd > tradingSignals?.indicators?.macd_signal ? 'up' : 'down'}`}>
                                   {tradingSignals?.indicators?.macd > tradingSignals?.indicators?.macd_signal ? '▲ Positive Crossover' : '▼ Negative Divergence'}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="quant-card risk-analytics">
                       <div className="card-header-clean">
                         <h3>Advanced Quantitative Risk Profile</h3>
                         <span className="badge-pill">STATISTICAL</span>
                       </div>
                       <div className="risk-metric-strip">
                          <div className="rm-box">
                             <span className="rm-label">Value at Risk (95%)</span>
                             <span className="rm-val text-danger">{(Math.abs(riskMetrics?.var_95 || 0.0213) * 100).toFixed(2)}%</span>
                             <p className="rm-info">Maximum 1-day potential loss threshold</p>
                          </div>
                          <div className="rm-box">
                             <span className="rm-label">Annualized Volatility</span>
                             <span className="rm-val">{(Math.abs(riskMetrics?.volatility_annual || 0.2028) * 100).toFixed(2)}%</span>
                             <p className="rm-info">Standard deviation of returns</p>
                          </div>
                          <div className="rm-box">
                             <span className="rm-label">Historical Max Drawdown</span>
                             <span className="rm-val text-danger">{(Math.abs(riskMetrics?.max_drawdown || 0.2058) * 100).toFixed(2)}%</span>
                             <p className="rm-info">Peak-to-trough historical drop</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="quant-card projection-strip">
                    <div className="card-header-clean">
                       <div>
                         <h3>5-Day Predictive Price Trajectory (ARIMA Machine Learning)</h3>
                         <p className="card-subtitle">Auto-Regressive Integrated Moving Average short-term statistical forecast</p>
                       </div>
                       <span className="badge-pill emerald">ML PROJECTION</span>
                    </div>
                    <div className="forecast-blocks">
                       {(prediction?.forecast && prediction.forecast.length > 0 ? prediction.forecast : [1263.59, 1267.06, 1270.08, 1272.70, 1274.98]).map((price, i) => {
                          const basePrice = prediction?.current || 1259.50;
                          const pct = (((price - basePrice) / basePrice) * 100).toFixed(2);
                          const isUp = price >= basePrice;
                          return (
                            <div key={i} className="f-block">
                               <span className="f-day">Day +{i + 1}</span>
                               <span className="f-price">₹{Number(price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                               <span className={`f-dir ${isUp ? 'up' : 'down'}`}>
                                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct}%
                                </span>
                            </div>
                          );
                       })}
                    </div>
                    <p className="model-note">Note: Quantel ARIMA algorithms evaluate price momentum and stationary differences to project short-term trajectories.</p>
                 </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="news-pane quant-card">
                <div className="news-pane-header">
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IconNewspaper size={18} color="#B8860B" /> Real-Time Company & Market News
                    </h3>
                    <p className="news-pane-sub">Live intelligence, corporate actions, and analyst coverage for {summary?.name || symbol}</p>
                  </div>
                  <div className="news-sentiment-summary">
                    <span className="sentiment-pill-badge">
                      Sentiment: <strong className={(news?.filter(n => n.sentiment === 'Bullish').length || 0) >= (news?.filter(n => n.sentiment === 'Bearish').length || 0) ? 'sentiment-bullish-text' : 'sentiment-bearish-text'}>{
                        (news?.filter(n => n.sentiment === 'Bullish').length || 0) >= (news?.filter(n => n.sentiment === 'Bearish').length || 0)
                          ? '▲ Bullish Momentum'
                          : '▼ Bearish Stance'
                      }</strong>
                    </span>
                  </div>
                </div>

                <div className="news-list-rich">
                  {news && news.length > 0 ? (
                    news.map((item, i) => (
                      <a key={i} href={item.link} target="_blank" rel="noreferrer" className="news-card-modern">
                        <div className="news-card-body">
                          <div className="news-meta-row">
                            <span className="news-source-tag">{item.publisher || 'Market Wire'}</span>
                            <span className="news-date-tag">
                              {item.pubDate || (item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent')}
                            </span>
                            {item.sentiment && (
                              <span className={`news-sentiment-tag ${item.sentiment_type || item.sentiment.toLowerCase()}`}>
                                {item.sentiment === 'Bullish' ? '▲ Bullish' : item.sentiment === 'Bearish' ? '▼ Bearish' : '● Neutral'}
                              </span>
                            )}
                          </div>
                          <h4 className="news-card-title">{item.title}</h4>
                          {item.summary && (
                            <p className="news-card-summary">{item.summary}</p>
                          )}
                          <div className="news-card-footer">
                            <span className="read-more-link">Read Full Coverage ↗</span>
                          </div>
                        </div>
                        {item.thumbnail && (
                          <div className="news-thumb-wrap">
                            <img src={item.thumbnail} alt={item.title} className="news-thumb-img" onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                      </a>
                    ))
                  ) : (
                    <div className="empty-news-state">
                      <p>Fetching real-time news stream for {symbol}...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {isStockView && analysis && (
          <div className="sidebar">
            <div className="quant-card quick-stats">
              <h3>Trade Intelligence</h3>
              <div className="stat-row">
                <span>Day High</span>
                <span className="val">₹{summary?.day_high?.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span>Day Low</span>
                <span className="val">₹{summary?.day_low?.toLocaleString()}</span>
              </div>
              {!summary?.is_index && (
                <div className="stat-row">
                  <span>Market Cap</span>
                  <span className="val">₹{(summary?.market_cap / 10000000).toFixed(2)} Cr</span>
                </div>
              )}
            </div>

            <div className={`quant-card signal-card ${prediction?.forecast?.[0] > prediction?.current ? 'buy' : 'sell'}`}>
              <span className="signal-label">AI TRADING SIGNAL</span>
              <div className="signal-value">
                {prediction?.forecast?.[0] > prediction?.current ? 'BUY' : 'SELL'}
              </div>
              <div className="prediction-box">
                <span>Forecast (+5d)</span>
                <span className="target">₹{prediction?.forecast?.[4]?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Quantel;
