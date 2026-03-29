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
  Cell 
} from 'recharts';
import './Quantel.css';

const API_URL = 'http://localhost:8000';

const Quantel = () => {
  const [symbol, setSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('1mo');
  
  // Data States
  const [analysis, setAnalysis] = useState(null);
  const [ohlc, setOhlc] = useState([]);
  const [prediction, setPrediction] = useState(null);

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

  useEffect(() => {
    fetchFullAnalysis(symbol);
  }, [fetchFullAnalysis, timeframe]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) fetchFullAnalysis(symbol.trim());
  };

  if (loading && !analysis) {
    return (
      <div className="quantel-container loading-state">
        <div className="loader"></div>
        <p>Analyzing market dynamics for {symbol}...</p>
      </div>
    );
  }

  const { summary, scores, shareholding, news, insights, events, technicals } = analysis || {};

  return (
    <div className="quantel-container">
      {/* Header Section */}
      <div className="quantel-header">
        <div className="header-info">
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
        </div>

        <form className="quantel-search" onSubmit={handleSearch}>
          <input 
            type="text" 
            placeholder="Search Symbol (e.g. TCS, INFY)" 
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
            {['overview', 'technicals', 'fundamentals', 'news'].map(tab => (
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
              </div>
            )}

            {activeTab === 'news' && (
              <div className="news-pane quant-card">
                <h3>Latest Market Sentiment</h3>
                <div className="news-list">
                  {news?.map((item, i) => (
                    <a key={i} href={item.link} target="_blank" rel="noreferrer" className="news-item">
                      <div className="news-meta">
                        <span className="news-provider">{item.publisher}</span>
                        <span className="news-time">{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                      </div>
                      <h4>{item.title}</h4>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

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
            <div className="stat-row">
              <span>Market Cap</span>
              <span className="val">₹{(summary?.market_cap / 10000000).toFixed(2)} Cr</span>
            </div>
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
      </div>
    </div>
  );
};

export default Quantel;
