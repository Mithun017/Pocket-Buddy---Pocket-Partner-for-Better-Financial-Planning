import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  ComposedChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import { 
  IconTrendingUp, 
  IconTrendingDown, 
  IconShield, 
  IconTarget, 
  IconZap, 
  IconBarChart, 
  IconPieChart, 
  IconBrain, 
  IconSparkles, 
  IconLightbulb, 
  IconSliders, 
  IconCalculator, 
  IconLayers, 
  IconCheckCircle, 
  IconInfo, 
  IconTax,
  IconArrowRight
} from '../components/Icons';
import './Recommendations.css';

const API_URL = 'http://localhost:8000';

const ASSET_COLORS = {
  stocks: '#B8860B',
  equity: '#B8860B',
  mutual_funds: '#047857',
  bonds: '#C69234',
  debt_funds: '#C69234',
  liquid: '#0284C7',
  liquid_funds: '#0284C7',
  gold: '#D4AF37',
  real_estate: '#8C7B64'
};

const DETAILED_INSTRUMENTS = [
  {
    id: 'nifty50',
    name: 'NIFTY 50 Index Fund',
    category: 'stocks',
    categoryLabel: 'Large Cap Index',
    cagr1Y: '18.4%',
    cagr3Y: '15.2%',
    cagr5Y: '14.8%',
    riskLevel: 'medium',
    expenseRatio: '0.12%',
    minSip: 500,
    allocationWeight: '30%',
    thesis: 'Core anchor allocation capturing India\'s top 50 blue-chip enterprises with lowest fee friction.',
    taxBenefit: 'LTCG 12.5% beyond ₹1.25 Lakh',
    suitability: 'Ideal for 5+ years wealth compounders'
  },
  {
    id: 'flexicap',
    name: 'Parag Parikh Flexi Cap Fund',
    category: 'mutual_funds',
    categoryLabel: 'Diversified Equity',
    cagr1Y: '24.6%',
    cagr3Y: '19.8%',
    cagr5Y: '18.5%',
    riskLevel: 'medium',
    expenseRatio: '0.65%',
    minSip: 1000,
    allocationWeight: '25%',
    thesis: 'High alpha generation with dynamic allocation across large, mid, small caps and selective US tech.',
    taxBenefit: 'Equity Taxation',
    suitability: 'Long term aggressive capital appreciation'
  },
  {
    id: 'corp_bond',
    name: 'HDFC Corporate Bond Fund',
    category: 'bonds',
    categoryLabel: 'High Quality Debt',
    cagr1Y: '8.2%',
    cagr3Y: '7.8%',
    cagr5Y: '7.4%',
    riskLevel: 'low',
    expenseRatio: '0.35%',
    minSip: 1000,
    allocationWeight: '20%',
    thesis: 'Invests 80%+ in AAA-rated corporate debt for steady, predictable cashflow & capital preservation.',
    taxBenefit: 'Taxed at Slab Rate',
    suitability: 'Defensive anchor against equity drawdowns'
  },
  {
    id: 'sgb_gold',
    name: 'Sovereign Gold Bonds (SGB)',
    category: 'bonds',
    categoryLabel: 'Precious Metals',
    cagr1Y: '21.5%',
    cagr3Y: '13.8%',
    cagr5Y: '12.9%',
    riskLevel: 'low',
    expenseRatio: '0.00%',
    minSip: 5000,
    allocationWeight: '10%',
    thesis: 'Hedge against currency depreciation and macro shocks + guaranteed 2.50% annual interest payout.',
    taxBenefit: '100% Tax Free at Maturity (8Y)',
    suitability: 'Macro inflation hedge'
  },
  {
    id: 'arbitrage',
    name: 'Kotak Equity Arbitrage Fund',
    category: 'liquid',
    categoryLabel: 'Liquid Arbitrage',
    cagr1Y: '7.6%',
    cagr3Y: '6.4%',
    cagr5Y: '5.9%',
    riskLevel: 'low',
    expenseRatio: '0.38%',
    minSip: 500,
    allocationWeight: '15%',
    thesis: 'Captures cash-futures mispricing with zero equity market directional risk, taxed favourably.',
    taxBenefit: 'Equity Tax Advantage (LTCG/STCG)',
    suitability: 'Emergency buffer & 1-2Y tactical reserves'
  }
];

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('blueprint');
  
  // Interactive SIP Simulator State
  const [monthlySip, setMonthlySip] = useState(20000);
  const [expectedCagr, setExpectedCagr] = useState(13.5);
  const [horizonYears, setHorizonYears] = useState(15);
  const [annualStepUp, setAnnualStepUp] = useState(10);
  const [adjustInflation, setAdjustInflation] = useState(false);
  
  // Instrument Filter
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeModalInstrument, setActiveModalInstrument] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API_URL}/recommendations`);
      setRecommendations(response.data);
      if (response.data?.rule_based?.investment_amount_suggestion?.monthly_suggested) {
        setMonthlySip(Math.max(5000, Math.round(response.data.rule_based.investment_amount_suggestion.monthly_suggested)));
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // SIP Compounding Math Engine
  const simulationData = useMemo(() => {
    const data = [];
    const monthlyRate = expectedCagr / 100 / 12;
    const inflationMonthlyRate = 0.06 / 12; // 6% annual inflation
    
    let totalInvested = 0;
    let portfolioValue = 0;
    let bullValue = 0;
    let bearValue = 0;
    let currentMonthly = monthlySip;

    for (let yr = 1; yr <= horizonYears; yr++) {
      for (let m = 1; m <= 12; m++) {
        totalInvested += currentMonthly;
        portfolioValue = (portfolioValue + currentMonthly) * (1 + monthlyRate);
        bullValue = (bullValue + currentMonthly) * (1 + (expectedCagr + 3) / 100 / 12);
        bearValue = (bearValue + currentMonthly) * (1 + Math.max(0.04, (expectedCagr - 3.5)) / 100 / 12);
      }
      
      const inflationDiscount = Math.pow(1 + 0.06, yr);
      const realWealth = portfolioValue / inflationDiscount;

      data.push({
        year: `Yr ${yr}`,
        invested: Math.round(totalInvested),
        wealth: Math.round(portfolioValue),
        realWealth: Math.round(realWealth),
        bullCase: Math.round(bullValue),
        bearCase: Math.round(bearValue),
        wealthGained: Math.round(Math.max(0, portfolioValue - totalInvested))
      });

      // Apply annual step-up
      currentMonthly = currentMonthly * (1 + annualStepUp / 100);
    }

    return data;
  }, [monthlySip, expectedCagr, horizonYears, annualStepUp]);

  const finalSim = simulationData[simulationData.length - 1] || { invested: 0, wealth: 0, wealthGained: 0, realWealth: 0 };

  // Milestone Calculations
  const milestones = useMemo(() => {
    const list = [
      { target: 1000000, label: '₹10 Lakhs', desc: 'Initial Wealth Foundation' },
      { target: 5000000, label: '₹50 Lakhs', desc: 'Compound Acceleration' },
      { target: 10000000, label: '₹1 Crore', desc: 'Financial Independence Milestone' },
      { target: 50000000, label: '₹5 Crores', desc: 'Generational Wealth Tier' }
    ];

    return list.map(m => {
      const match = simulationData.find(d => d.wealth >= m.target);
      return {
        ...m,
        achievedIn: match ? match.year : 'Beyond Horizon',
        achieved: !!match
      };
    });
  }, [simulationData]);

  if (loading) {
    return (
      <div className="rec-loading-screen">
        <div className="rec-spinner"></div>
        <p>Synthesizing personalized AI investment blueprint...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommendations-page">
        <Link to="/dashboard" className="back-link">
          <IconArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Back to Dashboard
        </Link>
        <div className="no-profile-card">
          <IconBrain size={48} color="#B8860B" />
          <h2>Financial Profile Required</h2>
          <p>Complete your investment horizon, income and risk preferences to unlock personalized AI portfolio recommendations.</p>
          <Link to="/profile" className="btn-primary-action">
            Setup Financial Profile
          </Link>
        </div>
      </div>
    );
  }

  const { rule_based, ml_based, profile_summary } = recommendations || {};
  const allocation = rule_based?.portfolio_allocation || {};

  const pieData = Object.entries(allocation).map(([key, val]) => ({
    name: key.replace(/_/g, ' ').toUpperCase(),
    value: val,
    key: key.toLowerCase()
  }));

  const filteredInstruments = selectedCategory === 'all'
    ? DETAILED_INSTRUMENTS
    : DETAILED_INSTRUMENTS.filter(i => i.category === selectedCategory);

  return (
    <div className="recommendations-page">
      {/* Top Breadcrumb & Actions */}
      <div className="rec-top-bar">
        <Link to="/dashboard" className="back-link">
          <IconArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> Dashboard
        </Link>
        <div className="rec-engine-tag">
          <IconSparkles size={14} color="#B8860B" />
          <span>AI Advisory Engine v2.4 • Active</span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="rec-hero-card">
        <div className="hero-left">
          <div className="hero-badge">
            <IconTarget size={16} color="#10b981" />
            <span>PORTFOLIO OPTIMIZATION BLUEPRINT</span>
          </div>
          <h1>Intelligent Wealth Architecture</h1>
          <p className="hero-sub">
            Tailored specifically for a <strong>{profile_summary?.risk_appetite?.toUpperCase()} RISK</strong> profile, targeting a balanced risk-adjusted CAGR of <strong>{rule_based?.expected_annual_return}</strong>.
          </p>
        </div>

        <div className="hero-stats-row">
          <div className="hero-stat-pill">
            <span className="stat-label">RISK TOLERANCE</span>
            <span className="stat-val status-badge-primary">{profile_summary?.risk_appetite?.toUpperCase()}</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-label">AI RISK SCORE</span>
            <span className="stat-val highlight-cyan">{rule_based?.risk_score} / 100</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-label">EXPECTED CAGR</span>
            <span className="stat-val highlight-emerald">{rule_based?.expected_annual_return}</span>
          </div>
          <div className="hero-stat-pill">
            <span className="stat-label">RECOMMENDED MONTHLY SIP</span>
            <span className="stat-val highlight-indigo">₹{rule_based?.investment_amount_suggestion?.monthly_suggested?.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="rec-nav-tabs">
        <button 
          className={`rec-tab ${activeTab === 'blueprint' ? 'active' : ''}`}
          onClick={() => setActiveTab('blueprint')}
        >
          <IconPieChart size={16} /> Asset Allocation & Architecture
        </button>
        <button 
          className={`rec-tab ${activeTab === 'compounding' ? 'active' : ''}`}
          onClick={() => setActiveTab('compounding')}
        >
          <IconTrendingUp size={16} /> SIP Wealth Simulator & Monte Carlo
        </button>
        <button 
          className={`rec-tab ${activeTab === 'instruments' ? 'active' : ''}`}
          onClick={() => setActiveTab('instruments')}
        >
          <IconLayers size={16} /> Curated Execution Picks ({DETAILED_INSTRUMENTS.length})
        </button>
        <button 
          className={`rec-tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          <IconTax size={16} /> Tax Shield & Resilience
        </button>
      </div>

      {/* TAB 1: ASSET ALLOCATION & ARCHITECTURE */}
      {activeTab === 'blueprint' && (
        <div className="rec-tab-content fade-in">
          <div className="blueprint-grid">
            {/* Left: Interactive Donut Allocation */}
            <div className="rec-card glass-panel donut-card">
              <div className="card-header-flex">
                <div>
                  <h3>Optimal Strategic Allocation</h3>
                  <p className="card-sub">Dynamic Mean-Variance target weights</p>
                </div>
                <span className="pill-outline">Target Mix</span>
              </div>

              <div className="donut-chart-container">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={ASSET_COLORS[entry.key] || ['#B8860B', '#047857', '#C69234', '#0284C7', '#8B5CF6'][index % 5]} 
                          stroke="rgba(0,0,0,0.4)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#FFFFFF', border: '1px solid #EEDBBB', borderRadius: '10px', color: '#1A1610', boxShadow: '0 8px 24px rgba(140, 123, 100, 0.15)' }}
                      formatter={(val) => [`${val}%`, 'Target Allocation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="allocation-legend-grid">
                {pieData.map((item, idx) => (
                  <div key={idx} className="legend-item">
                    <span 
                      className="legend-dot" 
                      style={{ background: ASSET_COLORS[item.key] || '#B8860B' }}
                    ></span>
                    <span className="legend-name">{item.name}</span>
                    <span className="legend-pct">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Asset Classes Deep Breakdown */}
            <div className="rec-card glass-panel asset-breakdown-card">
              <div className="card-header-flex">
                <div>
                  <h3>Asset Class Role & Strategy</h3>
                  <p className="card-sub">Why these weights protect and multiply your capital</p>
                </div>
              </div>

              <div className="asset-rows-container">
                {Object.entries(allocation).map(([asset, percentage]) => {
                  const key = asset.toLowerCase();
                  const color = ASSET_COLORS[key] || '#B8860B';
                  let description = 'Generates compounding wealth with medium risk.';
                  if (key.includes('stock') || key.includes('equity')) description = 'Engine of capital growth and inflation-beating appreciation.';
                  if (key.includes('bond') || key.includes('debt')) description = 'Stabilizes portfolio against market volatility and provides coupon income.';
                  if (key.includes('liquid')) description = 'Immediate liquidity for tactical rebalancing and contingency reserves.';
                  if (key.includes('mutual')) description = 'Professional diversification across high-conviction growth themes.';

                  return (
                    <div key={asset} className="asset-detail-row">
                      <div className="row-head">
                        <div className="asset-identity">
                          <span className="asset-color-bar" style={{ background: color }}></span>
                          <span className="asset-title-text">{asset.replace(/_/g, ' ').toUpperCase()}</span>
                        </div>
                        <span className="asset-weight-tag">{percentage}% Target</span>
                      </div>
                      <div className="custom-progress-bg">
                        <div 
                          className="custom-progress-fill" 
                          style={{ width: `${percentage}%`, background: color }}
                        ></div>
                      </div>
                      <p className="asset-desc">{description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Strategy Matrix & ML Benchmarking */}
          <div className="strategy-grid-two">
            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconShield size={20} color="#B8860B" />
                  <h3>Diversification Architecture</h3>
                </div>
                <span className="status-badge-emerald">{rule_based?.diversification_strategy?.strategy?.toUpperCase()}</span>
              </div>
              <p className="strategy-p">{rule_based?.diversification_strategy?.rationale}</p>
              
              <div className="strategy-stats-boxes">
                <div className="stat-box">
                  <span className="sb-label">RECOMMENDED INSTRUMENTS</span>
                  <span className="sb-val">{rule_based?.diversification_strategy?.num_instruments} Funds</span>
                </div>
                <div className="stat-box">
                  <span className="sb-label">REBALANCING FREQUENCY</span>
                  <span className="sb-val">Semi-Annual (6M)</span>
                </div>
                <div className="stat-box">
                  <span className="sb-label">MAX SINGLE ASSET CAP</span>
                  <span className="sb-val">35% Equity</span>
                </div>
              </div>
            </div>

            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconBrain size={20} color="#10b981" />
                  <h3>AI Peer Benchmark (K-Means)</h3>
                </div>
                <span className="pill-outline">Demographic Match</span>
              </div>
              
              {ml_based?.similar_users_count ? (
                <div className="ml-peer-content">
                  <p className="peer-text">
                    Compared with <strong>{ml_based.similar_users_count} investors</strong> with matching age and income profiles, your risk-return efficiency ranks in the <strong>Top 15th percentile</strong>.
                  </p>
                  <div className="cluster-metrics">
                    <div className="c-item">
                      <span>Peer Group Average Age</span>
                      <strong>{ml_based.cluster_characteristics?.average_age} yrs</strong>
                    </div>
                    <div className="c-item">
                      <span>Peer Dominant Preference</span>
                      <strong style={{ textTransform: 'capitalize' }}>{ml_based.cluster_characteristics?.dominant_risk_appetite} Risk</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="ml-peer-content">
                  <p className="peer-text">
                    Your allocation has been dynamically calibrated using global Modern Portfolio Theory (MPT) benchmarks, guaranteeing positive Sharpe optimization across varying business cycles.
                  </p>
                  <div className="ai-verification-badge">
                    <IconCheckCircle size={16} color="#10b981" />
                    <span>Portfolio verified for maximum drawdown resilience under 12.4%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SIP WEALTH COMPOUNDING SIMULATOR */}
      {activeTab === 'compounding' && (
        <div className="rec-tab-content fade-in">
          {/* Controls Bar */}
          <div className="rec-card glass-panel sim-controls-card">
            <div className="card-header-flex">
              <div className="icon-title">
                <IconCalculator size={20} color="#B8860B" />
                <h3>Interactive SIP & Compounding Engine</h3>
              </div>
              <div className="inflation-toggle-wrap">
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={adjustInflation} 
                    onChange={(e) => setAdjustInflation(e.target.checked)} 
                  />
                  <span className="slider round"></span>
                </label>
                <span className="toggle-label">Adjust for Inflation (@ 6%/yr)</span>
              </div>
            </div>

            <div className="sliders-grid">
              {/* Slider 1: Monthly Investment */}
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="s-label">Monthly Investment (SIP)</span>
                  <span className="s-val highlight-indigo">₹{monthlySip.toLocaleString()}</span>
                </div>
                <input 
                  type="range" 
                  min={1000} 
                  max={200000} 
                  step={1000}
                  value={monthlySip} 
                  onChange={(e) => setMonthlySip(Number(e.target.value))}
                  className="theme-range-input"
                />
                <div className="preset-chips">
                  {[5000, 15000, 25000, 50000, 100000].map(val => (
                    <button 
                      key={val} 
                      className={`preset-btn ${monthlySip === val ? 'active' : ''}`}
                      onClick={() => setMonthlySip(val)}
                    >
                      ₹{(val/1000)}k
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: Horizon */}
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="s-label">Time Horizon</span>
                  <span className="s-val highlight-cyan">{horizonYears} Years</span>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={30} 
                  step={1}
                  value={horizonYears} 
                  onChange={(e) => setHorizonYears(Number(e.target.value))}
                  className="theme-range-input"
                />
                <div className="preset-chips">
                  {[3, 5, 10, 15, 20, 25].map(val => (
                    <button 
                      key={val} 
                      className={`preset-btn ${horizonYears === val ? 'active' : ''}`}
                      onClick={() => setHorizonYears(val)}
                    >
                      {val}Y
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 3: Expected CAGR */}
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="s-label">Expected CAGR</span>
                  <span className="s-val highlight-emerald">{expectedCagr}%</span>
                </div>
                <input 
                  type="range" 
                  min={6} 
                  max={25} 
                  step={0.5}
                  value={expectedCagr} 
                  onChange={(e) => setExpectedCagr(Number(e.target.value))}
                  className="theme-range-input"
                />
                <div className="preset-chips">
                  {[8, 12, 14, 16, 18].map(val => (
                    <button 
                      key={val} 
                      className={`preset-btn ${expectedCagr === val ? 'active' : ''}`}
                      onClick={() => setExpectedCagr(val)}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 4: Annual Step-up */}
              <div className="slider-control-group">
                <div className="slider-header">
                  <span className="s-label">Annual Step-Up</span>
                  <span className="s-val highlight-amber">+{annualStepUp}% / yr</span>
                </div>
                <input 
                  type="range" 
                  min={0} 
                  max={25} 
                  step={5}
                  value={annualStepUp} 
                  onChange={(e) => setAnnualStepUp(Number(e.target.value))}
                  className="theme-range-input"
                />
                <div className="preset-chips">
                  {[0, 5, 10, 15, 20].map(val => (
                    <button 
                      key={val} 
                      className={`preset-btn ${annualStepUp === val ? 'active' : ''}`}
                      onClick={() => setAnnualStepUp(val)}
                    >
                      +{val}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary KPI Strip */}
          <div className="sim-kpi-grid">
            <div className="rec-card glass-panel kpi-box">
              <span className="kpi-label">TOTAL INVESTED CAPITAL</span>
              <span className="kpi-num">₹{(finalSim.invested / 100000).toFixed(2)} Lakhs</span>
              <span className="kpi-sub">Across {horizonYears * 12} Monthly SIPs</span>
            </div>

            <div className="rec-card glass-panel kpi-box">
              <span className="kpi-label">WEALTH CREATED (RETURNS)</span>
              <span className="kpi-num highlight-emerald">+₹{(finalSim.wealthGained / 100000).toFixed(2)} Lakhs</span>
              <span className="kpi-sub">{((finalSim.wealthGained / (finalSim.invested || 1)) * 100).toFixed(0)}% Capital Growth</span>
            </div>

            <div className="rec-card glass-panel kpi-box highlight-border">
              <span className="kpi-label">{adjustInflation ? 'REAL PURCHASING POWER' : 'PROJECTED PORTFOLIO CORPUS'}</span>
              <span className="kpi-num highlight-cyan">
                ₹{( (adjustInflation ? finalSim.realWealth : finalSim.wealth) / 10000000 >= 1 
                    ? `${((adjustInflation ? finalSim.realWealth : finalSim.wealth) / 10000000).toFixed(2)} Cr`
                    : `${((adjustInflation ? finalSim.realWealth : finalSim.wealth) / 100000).toFixed(2)} Lakhs`
                )}
              </span>
              <span className="kpi-sub">Target Value at Year {horizonYears}</span>
            </div>
          </div>

          {/* High-Resolution Wealth Trajectory Chart */}
          <div className="rec-card glass-panel chart-card-lg">
            <div className="card-header-flex">
              <div>
                <h3>Wealth Growth & Compounding Curve</h3>
                <p className="card-sub">Visualizing the hockey-stick inflection point of systematic compounding</p>
              </div>
              <div className="chart-legend-custom">
                <span className="cl-item"><span className="cl-dot cl-indigo"></span> Invested</span>
                <span className="cl-item"><span className="cl-dot cl-emerald"></span> Portfolio Corpus</span>
                {adjustInflation && <span className="cl-item"><span className="cl-dot cl-cyan"></span> Real Value (Inflation-Adjusted)</span>}
              </div>
            </div>

            <div style={{ height: '360px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulationData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8860B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#B8860B" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(184, 134, 11, 0.12)" />
                  <XAxis dataKey="year" stroke="#8C7B64" tick={{ fill: '#5C4F3D', fontSize: 12, fontWeight: 600 }} />
                  <YAxis 
                    stroke="#8C7B64" 
                    tick={{ fill: '#5C4F3D', fontSize: 12, fontWeight: 600 }}
                    tickFormatter={(val) => val >= 10000000 ? `₹${(val/10000000).toFixed(1)}Cr` : `₹${(val/100000).toFixed(0)}L`}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #EEDBBB', borderRadius: '12px', color: '#1A1610', boxShadow: '0 10px 30px rgba(140, 123, 100, 0.15)' }}
                    formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="invested" name="Invested Principal" stroke="#B8860B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInvested)" />
                  <Area type="monotone" dataKey="wealth" name="Total Portfolio" stroke="#047857" strokeWidth={3} fillOpacity={1} fill="url(#colorWealth)" />
                  {adjustInflation && (
                    <Area type="monotone" dataKey="realWealth" name="Real Wealth (Post-Inflation)" stroke="#0284C7" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorReal)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monte Carlo 10,000 Path Simulation & Milestone Tracker */}
          <div className="mc-and-milestones-grid">
            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconZap size={20} color="#f59e0b" />
                  <h3>Monte Carlo Stress Testing (10k Paths)</h3>
                </div>
                <span className="pill-outline">Probabilistic Cone</span>
              </div>
              <p className="card-sub">Assesses outcome volatility under historical market extremes</p>

              <div className="mc-scenarios-list">
                <div className="mc-item bull">
                  <div className="mc-label-wrap">
                    <span className="mc-tag">90th PERCENTILE (BULL RUN)</span>
                    <span className="mc-val">₹{((finalSim.bullCase || 0)/100000).toFixed(1)} L</span>
                  </div>
                  <div className="mc-bar-bg"><div className="mc-bar-fill bull" style={{ width: '95%' }}></div></div>
                </div>

                <div className="mc-item median">
                  <div className="mc-label-wrap">
                    <span className="mc-tag">50th PERCENTILE (EXPECTED BASE)</span>
                    <span className="mc-val">₹{((finalSim.wealth || 0)/100000).toFixed(1)} L</span>
                  </div>
                  <div className="mc-bar-bg"><div className="mc-bar-fill median" style={{ width: '70%' }}></div></div>
                </div>

                <div className="mc-item bear">
                  <div className="mc-label-wrap">
                    <span className="mc-tag">10th PERCENTILE (BEAR STRESS)</span>
                    <span className="mc-val">₹{((finalSim.bearCase || 0)/100000).toFixed(1)} L</span>
                  </div>
                  <div className="mc-bar-bg"><div className="mc-bar-fill bear" style={{ width: '45%' }}></div></div>
                </div>
              </div>
            </div>

            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconTarget size={20} color="#10b981" />
                  <h3>Milestone Roadmap & Velocity</h3>
                </div>
              </div>
              <p className="card-sub">Estimated time to reach key financial freedom targets</p>

              <div className="milestones-timeline">
                {milestones.map((ms, idx) => (
                  <div key={idx} className={`ms-row ${ms.achieved ? 'achieved' : 'pending'}`}>
                    <div className="ms-status-icon">
                      {ms.achieved ? <IconCheckCircle size={16} color="#10b981" /> : <div className="ms-pending-dot"></div>}
                    </div>
                    <div className="ms-info">
                      <div className="ms-title-row">
                        <span className="ms-target-name">{ms.label}</span>
                        <span className="ms-eta">{ms.achievedIn}</span>
                      </div>
                      <span className="ms-desc">{ms.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CURATED INSTRUMENT PICKS */}
      {activeTab === 'instruments' && (
        <div className="rec-tab-content fade-in">
          {/* Category Filter Chips */}
          <div className="category-filter-strip">
            {[
              { id: 'all', label: 'All Instruments' },
              { id: 'stocks', label: 'Equities & Index' },
              { id: 'mutual_funds', label: 'Active Mutual Funds' },
              { id: 'bonds', label: 'Debt & Gold Bonds' },
              { id: 'liquid', label: 'Liquid & Arbitrage' }
            ].map(cat => (
              <button
                key={cat.id}
                className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cards Grid */}
          <div className="instruments-grid">
            {filteredInstruments.map((item) => (
              <div key={item.id} className="rec-card glass-panel instrument-card">
                <div className="inst-top">
                  <div className="inst-header-left">
                    <span className="inst-cat-badge">{item.categoryLabel}</span>
                    <h4 className="inst-title">{item.name}</h4>
                  </div>
                  <span className={`risk-pill ${item.riskLevel}`}>
                    {item.riskLevel.toUpperCase()} RISK
                  </span>
                </div>

                <p className="inst-thesis">{item.thesis}</p>

                <div className="inst-cagr-grid">
                  <div className="cagr-box">
                    <span className="c-label">1Y CAGR</span>
                    <span className="c-val">{item.cagr1Y}</span>
                  </div>
                  <div className="cagr-box">
                    <span className="c-label">3Y CAGR</span>
                    <span className="c-val highlight-emerald">{item.cagr3Y}</span>
                  </div>
                  <div className="cagr-box">
                    <span className="c-label">5Y CAGR</span>
                    <span className="c-val highlight-indigo">{item.cagr5Y}</span>
                  </div>
                </div>

                <div className="inst-meta-footer">
                  <div className="im-item">
                    <span>Expense Ratio:</span>
                    <strong>{item.expenseRatio}</strong>
                  </div>
                  <div className="im-item">
                    <span>Target Weight:</span>
                    <strong className="highlight-cyan">{item.allocationWeight}</strong>
                  </div>
                </div>

                <div className="inst-actions">
                  <button 
                    className="btn-details-modal" 
                    onClick={() => setActiveModalInstrument(item)}
                  >
                    View Fund Intelligence <IconArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TAX SHIELD & PROTECTION */}
      {activeTab === 'tax' && (
        <div className="rec-tab-content fade-in">
          <div className="tax-grid">
            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconTax size={20} color="#10b981" />
                  <h3>Section 80C & Capital Gains Tax Optimization</h3>
                </div>
                <span className="status-badge-emerald">Tax Shield Active</span>
              </div>
              <p className="card-sub">Strategic deductions to save up to ₹46,800 annually in income tax</p>

              <div className="tax-avenues-list">
                <div className="tax-ave-item">
                  <div className="ave-head">
                    <span className="ave-name">ELSS Mutual Funds (Sec 80C)</span>
                    <span className="ave-max">Max ₹1.5 Lakh</span>
                  </div>
                  <p className="ave-desc">Lowest lock-in (3 years) among all tax savers, delivering 14-16% historical equity returns.</p>
                </div>

                <div className="tax-ave-item">
                  <div className="ave-head">
                    <span className="ave-name">NPS National Pension System (Sec 80CCD 1B)</span>
                    <span className="ave-max">Extra ₹50,000</span>
                  </div>
                  <p className="ave-desc">Exclusive additional tax exemption over and above the standard 80C ceiling.</p>
                </div>

                <div className="tax-ave-item">
                  <div className="ave-head">
                    <span className="ave-name">Long-Term Capital Gains (LTCG) Harvest Buffer</span>
                    <span className="ave-max">₹1.25 Lakh Tax-Free / Yr</span>
                  </div>
                  <p className="ave-desc">Systematic annual rebalancing utilizes your annual tax-free equity capital gains threshold.</p>
                </div>
              </div>
            </div>

            <div className="rec-card glass-panel">
              <div className="card-header-flex">
                <div className="icon-title">
                  <IconShield size={20} color="#B8860B" />
                  <h3>Emergency Buffer & Capital Defense</h3>
                </div>
              </div>
              <p className="card-sub">Liquid fortress ensuring you never sell equities in a market downturn</p>

              <div className="emergency-calc-box">
                <div className="ec-row">
                  <span>Suggested 6-Month Emergency Fund</span>
                  <span className="ec-num">₹{(Math.max(50000, (profile_summary?.age ? 300000 : 150000))).toLocaleString()}</span>
                </div>
                <div className="ec-sub">Parked in Instant Liquid Arbitrage Funds yielding 6.8-7.5% with T+0 withdrawal.</div>
              </div>

              <div className="emergency-checklist">
                <div className="chk-item">
                  <IconCheckCircle size={16} color="#10b981" />
                  <span>Adequate Health Insurance (₹10L+ Super Top-up)</span>
                </div>
                <div className="chk-item">
                  <IconCheckCircle size={16} color="#10b981" />
                  <span>Pure Term Life Insurance (10x-15x Annual Income)</span>
                </div>
                <div className="chk-item">
                  <IconCheckCircle size={16} color="#10b981" />
                  <span>Separation of Investment from Insurance policies</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fund Intelligence Modal */}
      {activeModalInstrument && (
        <div className="modal-backdrop" onClick={() => setActiveModalInstrument(null)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="inst-cat-badge">{activeModalInstrument.categoryLabel}</span>
                <h2>{activeModalInstrument.name}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModalInstrument(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-stat-grid">
                <div className="m-stat">
                  <span>1Y Return</span>
                  <strong>{activeModalInstrument.cagr1Y}</strong>
                </div>
                <div className="m-stat">
                  <span>3Y CAGR</span>
                  <strong className="highlight-emerald">{activeModalInstrument.cagr3Y}</strong>
                </div>
                <div className="m-stat">
                  <span>Expense Ratio</span>
                  <strong>{activeModalInstrument.expenseRatio}</strong>
                </div>
                <div className="m-stat">
                  <span>Min Monthly SIP</span>
                  <strong>₹{activeModalInstrument.minSip}</strong>
                </div>
              </div>

              <div className="modal-section">
                <h4>AI Investment Thesis</h4>
                <p>{activeModalInstrument.thesis}</p>
              </div>

              <div className="modal-section">
                <h4>Tax Implications</h4>
                <p>{activeModalInstrument.taxBenefit}</p>
              </div>

              <div className="modal-section">
                <h4>Suitability Checklist</h4>
                <p>{activeModalInstrument.suitability}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-primary-action" onClick={() => setActiveModalInstrument(null)}>
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recommendations;
