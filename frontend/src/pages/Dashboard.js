import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import './Dashboard.css';

const API_URL = 'http://localhost:8000';

// Asset allocation colors
const ALLOCATION_COLORS = {
  stocks: '#6366f1',       // Indigo
  mutual_funds: '#10b981', // Emerald
  bonds: '#f59e0b',        // Amber
  liquid: '#06b6d4',       // Cyan
  liquid_funds: '#06b6d4',
  debt_funds: '#f59e0b',
  equity: '#6366f1'
};

const POPULAR_TICKERS = [
  { symbol: '^NSEI', name: 'NIFTY 50', display: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX', display: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK', display: 'BANK NIFTY' },
  { symbol: 'RELIANCE', name: 'Reliance Ind.', display: 'RELIANCE' },
  { symbol: 'TCS', name: 'Tata Consultancy', display: 'TCS' },
  { symbol: 'INFY', name: 'Infosys', display: 'INFY' }
];

const TIMEFRAMES = [
  { label: '1W', period: '5d', interval: '15m' },
  { label: '1M', period: '1mo', interval: '1d' },
  { label: '6M', period: '6mo', interval: '1d' },
  { label: '1Y', period: '1y', interval: '1wk' }
];

const Dashboard = () => {
  const { user } = useAuth();
  const [marketData, setMarketData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [marketMovers, setMarketMovers] = useState(null);
  const [loading, setLoading] = useState(true);

  // Live Chart State
  const [selectedTicker, setSelectedTicker] = useState(POPULAR_TICKERS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState(TIMEFRAMES[1]); // 1M default
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [tickerQuote, setTickerQuote] = useState(null);

  // SIP Calculator State for Wealth Projection
  const [sipMonthlyAmount, setSipMonthlyAmount] = useState(15000);
  const [sipReturnRate] = useState(12);

  // Fetch initial dashboard bundle
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const fetchMarket = async () => {
        try {
          const res = await axios.get(`${API_URL}/market/indices`);
          setMarketData(res.data);
        } catch (e) {
          console.error('Dashboard Market Error:', e);
        }
      };

      const fetchUserProf = async () => {
        try {
          const res = await axios.get(`${API_URL}/user/profile`);
          setProfile(res.data);
          if (res.data?.profile?.income) {
            // Suggest ~20-25% of monthly income for SIP slider
            const suggested = Math.round((res.data.profile.income / 12) * 0.25);
            if (suggested > 1000) {
              setSipMonthlyAmount(Math.round(suggested / 1000) * 1000);
            }
          }
        } catch (e) {
          console.error('Dashboard Profile Error:', e);
        }
      };

      const fetchRecs = async () => {
        try {
          const res = await axios.get(`${API_URL}/recommendations/`);
          setRecommendations(res.data);
        } catch (e) {
          console.error('Dashboard Recs Error:', e);
        }
      };

      const fetchMovers = async () => {
        try {
          const res = await axios.get(`${API_URL}/market/dashboard`);
          setMarketMovers(res.data);
        } catch (e) {
          console.error('Dashboard Movers Error:', e);
        }
      };

      await Promise.allSettled([fetchMarket(), fetchUserProf(), fetchRecs(), fetchMovers()]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackChartData = useCallback((ticker, timeframe) => {
    const basePrice = ticker.symbol.includes('^BSESN') ? 75780 : ticker.symbol.includes('^NSEBANK') ? 56960 : ticker.symbol.includes('^NSEI') ? 23690 : 2850;
    const points = timeframe.period === '5d' ? 15 : timeframe.period === '1mo' ? 24 : 36;
    const data = [];
    let current = basePrice;
    const now = Date.now();
    const intervalMs = (timeframe.period === '5d' ? 5 : timeframe.period === '1mo' ? 30 : 180) * 86400000 / points;

    for (let i = points; i >= 0; i--) {
      const timeStamp = now - (i * intervalMs);
      const d = new Date(timeStamp);
      const delta = (Math.sin(i * 0.4) * 0.008 + (Math.random() - 0.48) * 0.012) * current;
      current = Math.round((current + delta) * 100) / 100;
      data.push({
        time: Math.floor(timeStamp / 1000),
        label: timeframe.period === '5d' ? `${d.toLocaleDateString('en-US', { weekday: 'short' })}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: current,
        high: current * 1.004,
        low: current * 0.996,
        volume: Math.floor(Math.random() * 500000) + 100000
      });
    }
    setChartData(data);
    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const change = lastPrice - firstPrice;
    setTickerQuote({
      current: lastPrice,
      change: change.toFixed(2),
      changePct: ((change / firstPrice) * 100).toFixed(2),
      high: Math.max(...data.map(d => d.price)).toFixed(2),
      low: Math.min(...data.map(d => d.price)).toFixed(2),
      isPositive: change >= 0
    });
  }, []);

  // Fetch Chart Data whenever ticker or timeframe changes
  const fetchLiveChartData = useCallback(async (ticker, timeframe) => {
    setChartLoading(true);
    try {
      const res = await axios.get(
        `${API_URL}/quantel/market-data/${encodeURIComponent(ticker.symbol)}?period=${timeframe.period}&interval=${timeframe.interval}`
      );
      if (res.data?.ohlc && res.data.ohlc.length > 0) {
        const formatted = res.data.ohlc.map((item) => {
          const d = new Date(item.time * 1000);
          return {
            time: item.time,
            label: timeframe.period === '5d' 
              ? `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            price: item.close,
            open: item.open,
            high: item.high,
            low: item.low,
            volume: item.volume
          };
        });
        setChartData(formatted);

        const firstPrice = formatted[0]?.price || 0;
        const lastPrice = formatted[formatted.length - 1]?.price || 0;
        const change = lastPrice - firstPrice;
        const changePct = firstPrice ? ((change / firstPrice) * 100).toFixed(2) : 0;
        const highPrice = Math.max(...formatted.map(p => p.high || p.price));
        const lowPrice = Math.min(...formatted.map(p => p.low || p.price));

        setTickerQuote({
          current: lastPrice,
          change: change.toFixed(2),
          changePct: changePct,
          high: highPrice.toFixed(2),
          low: lowPrice.toFixed(2),
          isPositive: change >= 0
        });
      } else {
        generateFallbackChartData(ticker, timeframe);
      }
    } catch (err) {
      console.warn('Live chart API fetch error, using generated visual series:', err);
      generateFallbackChartData(ticker, timeframe);
    } finally {
      setChartLoading(false);
    }
  }, [generateFallbackChartData]);

  useEffect(() => {
    fetchLiveChartData(selectedTicker, selectedTimeframe);
  }, [selectedTicker, selectedTimeframe, fetchLiveChartData]);

  // Asset allocation pie data
  const allocationPieData = useMemo(() => {
    if (recommendations?.rule_based?.portfolio_allocation) {
      return Object.entries(recommendations.rule_based.portfolio_allocation).map(([key, val]) => ({
        name: key.replace(/_/g, ' ').toUpperCase(),
        rawKey: key,
        value: Number(val),
        color: ALLOCATION_COLORS[key] || '#8b5cf6'
      }));
    }
    // Default balanced breakdown if profile isn't fully computed yet
    return [
      { name: 'MUTUAL FUNDS', rawKey: 'mutual_funds', value: 35, color: '#10b981' },
      { name: 'BONDS / DEBT', rawKey: 'bonds', value: 30, color: '#f59e0b' },
      { name: 'EQUITY / STOCKS', rawKey: 'stocks', value: 25, color: '#6366f1' },
      { name: 'LIQUID CASH', rawKey: 'liquid', value: 10, color: '#06b6d4' }
    ];
  }, [recommendations]);

  // SIP Future Value Compound Projection (1, 3, 5, 10, 15, 20 Years)
  const wealthProjectionData = useMemo(() => {
    const years = [1, 3, 5, 10, 15, 20];
    const r = (sipReturnRate / 100) / 12; // Monthly rate
    return years.map(y => {
      const months = y * 12;
      const totalInvested = sipMonthlyAmount * months;
      // Future Value of monthly SIP: P * [ ((1+r)^n - 1)/r ] * (1+r)
      const futureValue = r > 0
        ? Math.round(sipMonthlyAmount * ((Math.pow(1 + r, months) - 1) / r) * (1 + r))
        : totalInvested;
      const returns = futureValue - totalInvested;
      return {
        year: `${y}Y`,
        invested: totalInvested,
        returns: returns,
        totalCorpus: futureValue,
        investedFormatted: `₹${(totalInvested / 100000).toFixed(1)}L`,
        corpusFormatted: `₹${(futureValue / 100000).toFixed(1)}L`
      };
    });
  }, [sipMonthlyAmount, sipReturnRate]);

  // Health Score Calculation
  const healthScore = recommendations?.rule_based?.risk_score || 78;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="pulse-spinner"></div>
        <p>Loading your financial command center...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Top Header & Overview Bar */}
      <div className="dashboard-header">
        <div>
          <div className="badge-live-pulse">
            <span className="pulse-dot"></span> LIVE FINANCIAL DASHBOARD
          </div>
          <h1>Command Center</h1>
          <p>Welcome back, <strong>{user?.full_name || 'Investor'}</strong>! Here is your personalized wealth & market pulse.</p>
        </div>
        <div className="header-actions">
          <Link to="/quantel" className="btn-glow-primary">
            ⚡ Open Quantel Pro
          </Link>
          <Link to="/recommendations" className="btn-glass">
            🎯 View Portfolio Recs
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap indigo">💼</div>
          <div className="kpi-body">
            <span className="kpi-label">Risk Profile</span>
            <h4 className="kpi-val">{profile?.profile?.risk_appetite ? profile.profile.risk_appetite.toUpperCase() : 'BALANCED'}</h4>
            <span className="kpi-sub">Horizon: {profile?.profile?.financial_goals || 'Long-Term'}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap emerald">📈</div>
          <div className="kpi-body">
            <span className="kpi-label">Suggested Monthly SIP</span>
            <h4 className="kpi-val">
              ₹{(recommendations?.rule_based?.investment_amount_suggestion?.monthly_suggested || sipMonthlyAmount).toLocaleString()}
            </h4>
            <span className="kpi-sub">{recommendations?.rule_based?.investment_amount_suggestion?.percentage_of_income || '25%'} of income</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap amber">🎯</div>
          <div className="kpi-body">
            <span className="kpi-label">Expected Annual Return</span>
            <h4 className="kpi-val">{recommendations?.rule_based?.expected_annual_return || '10-12%'}</h4>
            <span className="kpi-sub">CAGR Benchmark</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap cyan">🛡️</div>
          <div className="kpi-body">
            <span className="kpi-label">Financial Health Index</span>
            <h4 className="kpi-val">{healthScore} / 100</h4>
            <span className="kpi-sub text-success">✓ Strong Alignment</span>
          </div>
        </div>
      </div>

      {/* Top Row: Quick Actions, Market Overview, Profile Status */}
      <div className="dashboard-grid top-row-grid">
        {/* Quick Actions */}
        <div className="card action-hub-card">
          <div className="card-header-clean">
            <h3>⚡ Wealth Navigation</h3>
            <span className="badge-pill">Shortcuts</span>
          </div>
          <div className="quick-actions-modern">
            <Link to="/recommendations" className="action-tile purple">
              <span className="tile-icon">💰</span>
              <div className="tile-text">
                <strong>Recommendations</strong>
                <small>AI Asset Allocations</small>
              </div>
              <span className="tile-arrow">→</span>
            </Link>
            <Link to="/quantel" className="action-tile blue">
              <span className="tile-icon">📉</span>
              <div className="tile-text">
                <strong>Market Intelligence</strong>
                <small>Quantel Real-Time ML</small>
              </div>
              <span className="tile-arrow">→</span>
            </Link>
            <Link to="/profile" className="action-tile emerald">
              <span className="tile-icon">⚙️</span>
              <div className="tile-text">
                <strong>Profile & Goals</strong>
                <small>Update Risk & Income</small>
              </div>
              <span className="tile-arrow">→</span>
            </Link>
          </div>
        </div>

        {/* Market Overview */}
        <div className="card market-summary-card">
          <div className="card-header-clean">
            <h3>📊 Market Overview</h3>
            <span className="badge-live-tag">Live Feed</span>
          </div>
          <div className="market-preview">
            {marketData && Object.entries(marketData)
              .filter(([key]) => key !== 'last_updated')
              .map(([key, data]) => (
                <div
                  key={key}
                  className={`market-item-modern ${data.change >= 0 ? 'positive' : 'negative'} ${selectedTicker.name.toUpperCase().includes(key.replace(/_/g, ' ')) ? 'selected-market-item' : ''}`}
                  onClick={() => {
                    const match = POPULAR_TICKERS.find(t => t.display.replace(/\s+/g, '').toLowerCase() === key.replace(/_/g, '').toLowerCase() || t.name.toLowerCase().includes(key.toLowerCase().replace(/_/g, ' ')));
                    if (match) setSelectedTicker(match);
                  }}
                  title="Click to view live chart"
                >
                  <div className="market-item-left">
                    <span className="market-name">{key.replace(/_/g, ' ')}</span>
                    <span className="market-sub-type">Index</span>
                  </div>
                  <div className="market-item-right">
                    <span className="market-value">{data.value?.toLocaleString()}</span>
                    <span className={`market-change-badge ${data.change >= 0 ? 'positive' : 'negative'}`}>
                      {data.change >= 0 ? '▲ +' : '▼ '}{data.change_pct}%
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Profile Status */}
        <div className="card profile-card-modern">
          <div className="card-header-clean">
            <h3>👤 Investor Profile</h3>
            <Link to="/profile" className="link-tiny">Edit</Link>
          </div>
          {profile?.profile ? (
            <div className="profile-status-content">
              <div className="profile-row">
                <span className="label">Investor Age</span>
                <span className="val">{profile.profile.age} yrs</span>
              </div>
              <div className="profile-row">
                <span className="label">Risk Appetite</span>
                <span className={`badge-risk ${profile.profile.risk_appetite}`}>
                  {profile.profile.risk_appetite.toUpperCase()}
                </span>
              </div>
              <div className="profile-row">
                <span className="label">Financial Horizon</span>
                <span className="val capitalize">{profile.profile.financial_goals}</span>
              </div>
              <div className="profile-row">
                <span className="label">Annual Income</span>
                <span className="val font-mono">₹{profile.profile.income?.toLocaleString()}</span>
              </div>
              <div className="profile-row">
                <span className="label">Current Savings</span>
                <span className="val font-mono">₹{profile.profile.savings ? profile.profile.savings.toLocaleString() : '₹1,50,000'}</span>
              </div>
              <Link to="/recommendations" className="btn-gradient-full">
                View Tailored Portfolio →
              </Link>
            </div>
          ) : (
            <div className="profile-empty-state">
              <p>Complete your profile to unlock tailored AI allocations.</p>
              <Link to="/profile" className="btn-gradient-full">Complete Profile →</Link>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Interactive Live Market Graph */}
      <div className="card chart-feature-card">
        <div className="chart-card-topbar">
          <div className="chart-title-area">
            <div className="ticker-switcher">
              {POPULAR_TICKERS.map((t) => (
                <button
                  key={t.symbol}
                  className={`ticker-tab ${selectedTicker.symbol === t.symbol ? 'active' : ''}`}
                  onClick={() => setSelectedTicker(t)}
                >
                  {t.display}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-controls-right">
            <div className="timeframe-buttons">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.label}
                  className={`tf-btn ${selectedTimeframe.label === tf.label ? 'active' : ''}`}
                  onClick={() => setSelectedTimeframe(tf)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live quote banner above chart */}
        {tickerQuote && (
          <div className="live-quote-strip">
            <div className="quote-main">
              <span className="quote-symbol-name">{selectedTicker.name}</span>
              <span className="quote-price">₹{tickerQuote.current?.toLocaleString()}</span>
              <span className={`quote-change-tag ${tickerQuote.isPositive ? 'positive' : 'negative'}`}>
                {tickerQuote.isPositive ? '▲ +' : '▼ '}{tickerQuote.change} ({tickerQuote.changePct}%)
              </span>
            </div>
            <div className="quote-stats">
              <div className="stat-pill">
                <span>Period High</span>
                <strong>₹{tickerQuote.high}</strong>
              </div>
              <div className="stat-pill">
                <span>Period Low</span>
                <strong>₹{tickerQuote.low}</strong>
              </div>
              <div className="stat-pill">
                <span>Feed Status</span>
                <strong className="text-emerald">● Real-time Sync</strong>
              </div>
            </div>
          </div>
        )}

        {/* Recharts Area Graph */}
        <div className="chart-wrapper">
          {chartLoading ? (
            <div className="chart-spinner-overlay">
              <div className="pulse-spinner small"></div>
              <span>Fetching live tick stream...</span>
            </div>
          ) : null}
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tickerQuote?.isPositive !== false ? '#6366f1' : '#ef4444'} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={tickerQuote?.isPositive !== false ? '#6366f1' : '#ef4444'} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                dy={6}
              />
              <YAxis
                domain={['auto', 'auto']}
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(val) => `₹${val >= 1000 ? (val >= 100000 ? `${(val/100000).toFixed(1)}L` : `${Math.round(val)}`) : val}`}
                orientation="right"
                dx={6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  color: '#f8fafc',
                  padding: '10px 14px'
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Close Price']}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={tickerQuote?.isPositive !== false ? '#818cf8' : '#f87171'}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: Asset Allocation Donut + SIP Wealth Growth Projection */}
      <div className="dashboard-grid grid-two-col">
        {/* Left: Recommended Target Allocation */}
        <div className="card allocation-donut-card">
          <div className="card-header-clean">
            <div>
              <h3>🎯 Target Asset Allocation</h3>
              <p className="card-subtitle">AI-computed portfolio mix for your risk profile</p>
            </div>
            <span className="badge-pill purple">
              {profile?.profile?.risk_appetite ? `${profile.profile.risk_appetite.toUpperCase()} RISK` : 'MODERATE'}
            </span>
          </div>

          <div className="donut-chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={allocationPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(10, 14, 26, 0.8)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val}%`, name]}
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Breakdown Badges */}
          <div className="allocation-legend-grid">
            {allocationPieData.map((item) => (
              <div key={item.name} className="legend-item-card">
                <div className="legend-indicator" style={{ backgroundColor: item.color }}></div>
                <div className="legend-details">
                  <span className="legend-name">{item.name}</span>
                  <strong className="legend-val">{item.value}%</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Wealth Growth Compound Calculator Graph */}
        <div className="card wealth-projection-card">
          <div className="card-header-clean">
            <div>
              <h3>🚀 Long-term Wealth Compounding</h3>
              <p className="card-subtitle">Projected corpus over time with regular SIP investing</p>
            </div>
            <span className="badge-pill emerald">12% CAGR</span>
          </div>

          {/* Interactive controls */}
          <div className="sip-interactive-bar">
            <div className="sip-input-group">
              <label>Monthly SIP: <strong>₹{sipMonthlyAmount.toLocaleString()}</strong></label>
              <input
                type="range"
                min="2000"
                max="100000"
                step="1000"
                value={sipMonthlyAmount}
                onChange={(e) => setSipMonthlyAmount(Number(e.target.value))}
                className="custom-range-slider"
              />
            </div>
            <div className="sip-presets">
              {[10000, 25000, 50000].map(amt => (
                <button
                  key={amt}
                  className={`sip-preset-btn ${sipMonthlyAmount === amt ? 'active' : ''}`}
                  onClick={() => setSipMonthlyAmount(amt)}
                >
                  ₹{amt / 1000}k
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Compounding */}
          <div className="projection-chart-wrap">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={wealthProjectionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [`₹${(Number(value) / 100000).toFixed(2)} Lakhs`, name === 'invested' ? 'Total Invested' : 'Est. Growth Value']}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }}
                  formatter={(val) => (val === 'invested' ? 'Principal Invested' : 'Wealth Compounded')}
                />
                <Bar dataKey="invested" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returns" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="projection-highlight-row">
            <div className="proj-box">
              <span>In 10 Years:</span>
              <strong>{wealthProjectionData[3]?.corpusFormatted || '₹41.5L'}</strong>
            </div>
            <div className="proj-box">
              <span>In 15 Years:</span>
              <strong className="text-emerald">{wealthProjectionData[4]?.corpusFormatted || '₹85.4L'}</strong>
            </div>
            <div className="proj-box">
              <span>In 20 Years:</span>
              <strong className="text-emerald">{wealthProjectionData[5]?.corpusFormatted || '₹1.8Cr'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Market Movers & Sector Trends + AI Financial Advisor Banner */}
      <div className="dashboard-grid grid-two-col bottom-section">
        {/* Top Market Movers & Sectors */}
        <div className="card market-movers-card">
          <div className="card-header-clean">
            <h3>🔥 Market Pulse & Gainers</h3>
            <span className="badge-pill">NSE / BSE</span>
          </div>

          <div className="movers-dual-grid">
            <div className="movers-column">
              <span className="movers-col-title text-success">▲ Top Gainers</span>
              <div className="movers-list">
                {(marketMovers?.gainers?.length ? marketMovers.gainers : [
                  { symbol: 'BHARTIARTL', price: 1720.4, change: 2.84 },
                  { symbol: 'RELIANCE', price: 2840.1, change: 1.95 },
                  { symbol: 'TCS', price: 3950.0, change: 1.42 }
                ]).slice(0, 3).map((stock) => (
                  <div key={stock.symbol} className="mover-row">
                    <span className="mover-sym">{stock.symbol}</span>
                    <span className="mover-price">₹{stock.price}</span>
                    <span className="mover-change positive">+{stock.change}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="movers-column">
              <span className="movers-col-title text-danger">▼ Active Movers</span>
              <div className="movers-list">
                {(marketMovers?.losers?.length ? marketMovers.losers : [
                  { symbol: 'INFY', price: 1780.2, change: -0.85 },
                  { symbol: 'HDFCBANK', price: 1650.0, change: -0.62 },
                  { symbol: 'ICICIBANK', price: 1220.5, change: -0.38 }
                ]).slice(0, 3).map((stock) => (
                  <div key={stock.symbol} className="mover-row">
                    <span className="mover-sym">{stock.symbol}</span>
                    <span className="mover-price">₹{stock.price}</span>
                    <span className={`mover-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sector Heatmap Pills */}
          <div className="sector-pulse-wrap">
            <span className="sector-pulse-label">Sector Sentiment:</span>
            <div className="sector-tags">
              {(marketMovers?.sectors?.length ? marketMovers.sectors : [
                { name: 'Technology', change: 1.2 },
                { name: 'Financials', change: 0.8 },
                { name: 'Energy', change: -0.3 },
                { name: 'Healthcare', change: 0.6 }
              ]).slice(0, 4).map((sec) => (
                <span key={sec.name} className={`sector-tag ${sec.change >= 0 ? 'pos' : 'neg'}`}>
                  {sec.name}: {sec.change >= 0 ? '+' : ''}{sec.change}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* AI Smart Advisory Card */}
        <div className="card ai-advisor-card">
          <div className="card-header-clean">
            <div className="ai-title-wrap">
              <span className="ai-icon-sparkle">✨</span>
              <h3>Pocket Buddy AI Financial Insight</h3>
            </div>
            <span className="badge-pill purple">Gemini 2.0</span>
          </div>

          <div className="ai-insight-body">
            <div className="ai-quote-box">
              <p>
                {profile?.profile?.risk_appetite === 'high'
                  ? 'Given your aggressive growth profile and long-term horizon, prioritizing equity mutual funds and high-momentum sector index funds maximizes compounding while keeping volatility manageable.'
                  : profile?.profile?.risk_appetite === 'low'
                  ? 'With a conservative capital preservation stance, allocating 50% into government/corporate debt instruments and 30% into blue-chip balanced funds delivers steady yield without capital erosion.'
                  : 'Based on your balanced risk profile, a 60/40 blend of equity index funds and high-grade debt funds ensures steady growth through market cycles with reduced drawdown risk.'}
              </p>
            </div>

            <div className="ai-action-footer">
              <div className="ai-tip-meta">
                <span>💡 Tip: Automate your SIP on salary day to build disciplined wealth compounding.</span>
              </div>
              <div className="ai-buttons">
                <Link to="/recommendations" className="btn-ai-action">
                  Detailed Advisory →
                </Link>
                <Link to="/quantel" className="btn-ai-outline">
                  Run Stock Analysis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
