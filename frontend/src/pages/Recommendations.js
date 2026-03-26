import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Recommendations.css';

const API_URL = 'http://localhost:8000';

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`${API_URL}/recommendations/`);
      setRecommendations(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading recommendations...</div>;

  if (error) {
    return (
      <div className="recommendations-page">
        <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
        <div className="no-profile">
          <h2>Complete Your Profile</h2>
          <p>Please complete your profile to get personalized investment recommendations.</p>
          <Link to="/profile" className="btn-primary">Complete Profile</Link>
        </div>
      </div>
    );
  }

  const { rule_based } = recommendations;
  const colors = ['bonds', 'stocks', 'mutual_funds', 'liquid'];

  return (
    <div className="recommendations-page">
      <Link to="/dashboard" className="back-link">← Back to Dashboard</Link>
      <h1>Your Personalized Recommendations</h1>
      <p className="subtitle">Based on your risk profile: <strong>{recommendations.profile_summary.risk_appetite.toUpperCase()}</strong></p>

      <div className="recommendations-grid">
        {/* Portfolio Allocation */}
        <div className="recommendation-card">
          <h3>Suggested Portfolio Allocation</h3>
          <div className="allocation-chart">
            {Object.entries(rule_based.portfolio_allocation).map(([asset, percentage], index) => (
              <div key={asset} className="allocation-item">
                <div className="allocation-header">
                  <span>{asset.replace('_', ' ').toUpperCase()}</span>
                  <span>{percentage}%</span>
                </div>
                <div className="allocation-bar">
                  <div
                    className={`allocation-fill ${colors[index % colors.length]}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Specific Recommendations */}
        <div className="recommendation-card">
          <h3>Recommended Instruments</h3>
          <div className="specific-recommendations">
            {rule_based.specific_recommendations.map((rec, index) => (
              <div key={index} className="rec-item">
                <div>
                  <div className="rec-name">{rec.name}</div>
                  <div className="rec-category">{rec.category}</div>
                </div>
                <div>
                  <div className="rec-return">{rec.expected_return}</div>
                  <div className={`rec-risk ${rec.risk_level}`}>{rec.risk_level}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="recommendation-card">
          <h3>Portfolio Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{rule_based.expected_annual_return}</div>
              <div className="stat-label">Expected Return</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{rule_based.risk_score}</div>
              <div className="stat-label">Risk Score</div>
            </div>
          </div>

          <div className="investment-suggestion">
            <div className="suggestion-amount">
              ₹{rule_based.investment_amount_suggestion.monthly_suggested.toLocaleString()}
            </div>
            <div className="suggestion-label">
              Monthly SIP Suggestion ({rule_based.investment_amount_suggestion.percentage_of_income})
            </div>
          </div>
        </div>

        {/* Diversification Strategy */}
        <div className="recommendation-card">
          <h3>Diversification Strategy</h3>
          <p><strong>Strategy:</strong> {rule_based.diversification_strategy.strategy}</p>
          <p><strong>Recommended Instruments:</strong> {rule_based.diversification_strategy.num_instruments}</p>
          <p style={{ color: '#666', marginTop: '10px' }}>{rule_based.diversification_strategy.rationale}</p>
        </div>
      </div>
    </div>
  );
};

export default Recommendations;
