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
                      <h3>📊 Market Movers</h3>
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
                    <h3>🏗️ Sector Performance</h3>
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
                    <h3>🔥 Trending Stocks (NSE)</h3>
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
                     <h3>📊 Global Market Pulse</h3>
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

            {activeTab === 'technicals' && (
              <div className="technicals-pane">
                <div className="indicators-grid">
                  <div className="quant-card indicator-box">
                    <h3>Momentum (RSI)</h3>
                    <div className="indicator-value">
                      <span className="big-val">{technicals?.rsi}</span>
                      <span className={`status-pill ${technicals?.rsi > 70 ? 'danger' : technicals?.rsi < 30 ? 'success' : 'neutral'}`}>
                        {technicals?.rsi > 70 ? 'Overbought' : technicals?.rsi < 30 ? 'Oversold' : 'Neutral'}
                      </span>
                    </div>
                    <p className="desc">Relative Strength Index (14-day window)</p>
                  </div>

                  <div className="quant-card indicator-box">
                    <h3>Trend (MACD)</h3>
                    <div className="indicator-value">
                      <span className="big-val">{technicals?.macd?.toFixed(2)}</span>
                      <span className={`status-pill ${technicals?.macd > technicals?.macd_signal ? 'success' : 'danger'}`}>
                        {technicals?.macd > technicals?.macd_signal ? 'Bullish Crossover' : 'Bearish Crossover'}
                      </span>
                    </div>
                    <p className="desc">Moving Average Convergence Divergence</p>
                  </div>

                  <div className="quant-card indicator-box">
                    <h3>Moving Averages</h3>
                    <div className="ma-rows">
                      <div className="ma-row">
                        <span>SMA 20</span>
                        <span className="val">₹{technicals?.sma_20}</span>
                      </div>
                      <div className="ma-row">
                        <span>SMA 50</span>
                        <span className="val">₹{technicals?.sma_50}</span>
                      </div>
                    </div>
                    <div className={`trend-flag ${technicals?.trend}`}>
                      TREND: {technicals?.trend?.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fundamentals' && (
              <div className="fundamentals-pane">
                <div className="scores-row">
                  {Object.entries(scores || {}).map(([key, val]) => (
                    <div key={key} className="score-card quant-card">
                      <span className="score-label">{key.toUpperCase()}</span>
                      <div className="gauge-container">
                        <div className={`gauge-fill score-${val}`}></div>
                        <span className="score-value">{val}/5</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!summary?.is_index && (
                  <div className="shareholding-section quant-card">
                    <h3>Shareholding Pattern</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer>
                        <BarChart data={shareholding} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="label" type="category" width={100} tick={{ fill: '#94a3b8' }} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {shareholding?.map((entry, index) => (
                              <Cell key={index} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
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
                    <h3>Portfolio Weight Optimization</h3>
                    <p className="desc">Enter stock symbols to calculate the optimal asset allocation for maximum Sharpe Ratio (Mean-Variance Theory).</p>
                    <form className="p-opt-form" onSubmit={handleOptimize}>
                       <input 
                         type="text" 
                         value={portfolioInput} 
                         onChange={(e) => setPortfolioInput(e.target.value)}
                         placeholder="Stock symbols separated by comma"
                       />
                       <button type="submit" disabled={optimizeLoading}>
                         {optimizeLoading ? 'Calculating...' : 'Optimize Asset Mix'}
                       </button>
                    </form>
                 </div>

                 {optimization && (
                   <div className="optimization-results">
                      <div className="opt-metrics-grid">
                         <div className="quant-card o-stat">
                            <span className="o-label">EXPECTED ANNUAL RETURN</span>
                            <span className="o-val">{(optimization.expected_return * 100).toFixed(2)}%</span>
                         </div>
                         <div className="quant-card o-stat">
                            <span className="o-label">PORTFOLIO VOLATILITY</span>
                            <span className="o-val">{(optimization.expected_volatility * 100).toFixed(2)}%</span>
                         </div>
                         <div className="quant-card o-stat highlights">
                            <span className="o-label">SHARPE RATIO</span>
                            <span className="o-val">{optimization.sharpe_ratio.toFixed(2)}</span>
                         </div>
                      </div>

                      <div className="opt-visuals quant-card">
                         <div className="pie-container" style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer>
                               <PieChart>
                                  <Pie
                                    data={Object.entries(optimization.weights).map(([k, v]) => ({ name: k, value: v }))}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {Object.entries(optimization.weights).map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#ef4444'][index % 5]} />
                                    ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', color: 'white' }}
                                    formatter={(value) => `${(value * 100).toFixed(2)}%`}
                                  />
                                  <Legend verticalAlign="bottom" height={36}/>
                               </PieChart>
                            </ResponsiveContainer>
                         </div>
                         <div className="weights-table">
                            {Object.entries(optimization.weights).filter(([_, v]) => v > 0).map(([k, v]) => (
                               <div key={k} className="weight-row">
                                  <span className="w-sym">{k}</span>
                                  <div className="w-bar-bg"><div className="w-bar-fill" style={{ width: `${v * 100}%` }}></div></div>
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
                       <h3>Trading Decision Engine</h3>
                       <div className="signal-gauge-wrapper">
                          <div className={`gauge-display ${tradingSignals?.signal}`}>
                             <span className="g-label">VERDICT</span>
                             <span className="g-signal">{tradingSignals?.signal?.toUpperCase()}</span>
                             <div className="score-meter">
                                <div className="meter-fill" style={{ width: `${((tradingSignals?.score + 3) / 6) * 100}%` }}></div>
                             </div>
                             <span className="g-score">CONFIDENCE SCORE: {tradingSignals?.score > 0 ? '+' : ''}{tradingSignals?.score}</span>
                          </div>
                          <div className="signal-rationale">
                             <div className="r-item">
                                <span>Momentum</span>
                                <span className={tradingSignals?.indicators.rsi < 30 ? 'up' : tradingSignals?.indicators.rsi > 70 ? 'down' : 'neutral'}>
                                   {tradingSignals?.indicators.rsi < 30 ? 'Bullish Oversold' : tradingSignals?.indicators.rsi > 70 ? 'Bearish Overbought' : 'Neutral Zone'}
                                </span>
                             </div>
                             <div className="r-item">
                                <span>Trend</span>
                                <span className={tradingSignals?.indicators.trend === 'bullish' ? 'up' : 'down'}>
                                   {tradingSignals?.indicators.trend.toUpperCase()} (SMA 20/50)
                                </span>
                             </div>
                             <div className="r-item">
                                <span>MACD</span>
                                <span className={tradingSignals?.indicators.macd > tradingSignals?.indicators.macd_signal ? 'up' : 'down'}>
                                   {tradingSignals?.indicators.macd > tradingSignals?.indicators.macd_signal ? 'Positive Crossover' : 'Negative Divergence'}
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="quant-card risk-analytics">
                       <h3>Advanced Risk Profile</h3>
                       <div className="risk-metric-strip">
                          <div className="rm-box">
                             <span className="rm-label">VaR (95%)</span>
                             <span className="rm-val">{(Math.abs(riskMetrics?.var_95 || 0) * 100).toFixed(2)}%</span>
                             <p className="rm-info">Daily potential loss</p>
                          </div>
                          <div className="rm-box">
                             <span className="rm-label">Annualized Vol</span>
                             <span className="rm-val">{(riskMetrics?.volatility_annual * 100).toFixed(2)}%</span>
                             <p className="rm-info">Market sensitivity</p>
                          </div>
                          <div className="rm-box">
                             <span className="rm-label">Max Drawdown</span>
                             <span className="rm-val">{(Math.abs(riskMetrics?.max_drawdown || 0) * 100).toFixed(2)}%</span>
                             <p className="rm-info">Historical peak-to-trough</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="quant-card projection-strip">
                    <h3>5-Day Predictive Forecast (ARIMA Model)</h3>
                    <div className="forecast-blocks">
                       {prediction?.forecast?.map((price, i) => (
                          <div key={i} className="f-block">
                             <span className="f-day">Day {i + 1}</span>
                             <span className="f-price">₹{price.toLocaleString()}</span>
                             <span className={`f-dir ${price > prediction.current ? 'up' : 'down'}`}>
                                {price > prediction.current ? '▲' : '▼'} {(((price - prediction.current)/prediction.current)*100).toFixed(2)}%
                             </span>
                          </div>
                       ))}
                    </div>
                    <p className="model-note">Note: Quantel Engine uses auto-regressive integrated moving averages for short-term trend projection.</p>
                 </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div className="news-pane quant-card">
                <div className="news-pane-header">
                  <div>
                    <h3>📰 Real-Time Company & Market News</h3>
                    <p className="news-pane-sub">Live intelligence, corporate actions, and analyst coverage for {summary?.name || symbol}</p>
                  </div>
                  <div className="news-sentiment-summary">
                    <span className="sentiment-pill-badge">
                      Sentiment: <strong>{
                        (news?.filter(n => n.sentiment === 'Bullish').length || 0) >= (news?.filter(n => n.sentiment === 'Bearish').length || 0)
                          ? '🟢 Bullish Momentum'
                          : '🔴 Bearish Stance'
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
