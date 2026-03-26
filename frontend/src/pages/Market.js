import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Market.css';

const API_URL = 'http://localhost:8000';

const Market = () => {
  const [indices, setIndices] = useState(null);
  const [trending, setTrending] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      const [indicesRes, trendingRes] = await Promise.all([
        axios.get(`${API_URL}/market/indices`),
        axios.get(`${API_URL}/market/trending`)
      ]);
      setIndices(indicesRes.data);
      setTrending(trendingRes.data.trending);
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.length >= 2) {
      try {
        const response = await axios.get(`${API_URL}/market/search?query=${query}`);
        setSearchResults(response.data.results);
      } catch (error) {
        console.error('Search error:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  if (loading) return <div className="loading">Loading live market data...</div>;

  return (
    <div className="market-page">
      <h1>📈 Market Insights</h1>

      <div className="market-grid">
        {/* Market Indices */}
        <div className="market-card">
          <h3>🏛️ Market Indices</h3>
          <div className="indices-grid">
            {indices && Object.entries(indices)
              .filter(([key]) => key !== 'last_updated')
              .map(([name, data]) => (
                <div key={name} className="index-item">
                  <span className="index-name">{name.replace(/_/g, ' ')}</span>
                  <span className="index-value">{data.value?.toLocaleString()}</span>
                  <span className={`index-change ${data.change >= 0 ? 'positive' : 'negative'}`}>
                    {data.change >= 0 ? '▲' : '▼'} {data.change_pct}%
                  </span>
                </div>
              ))}
          </div>
          {indices?.last_updated && (
            <div className="last-updated">
              Live data • {new Date(indices.last_updated).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Trending Stocks */}
        <div className="market-card">
          <h3>🔥 Trending Stocks (NSE)</h3>
          <div className="trending-list">
            {trending.map((stock) => (
              <div key={stock.symbol} className="trending-item">
                <div className="trending-info">
                  <span className="trending-symbol">{stock.symbol}</span>
                  <span className="trending-name">{stock.name}</span>
                </div>
                <span className="trending-sector">{stock.sector}</span>
                <span className={`trending-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                  {stock.change >= 0 ? '+' : ''}{stock.change}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="market-card" style={{ gridColumn: '1 / -1' }}>
          <h3>🔍 Search Instruments</h3>
          <div className="search-section">
            <input
              type="text"
              className="search-input"
              placeholder="Search stocks by name or symbol (e.g. Reliance, TCS, INFY)..."
              value={searchQuery}
              onChange={handleSearch}
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <div key={result.symbol} className="search-result-item">
                    <div>
                      <span className="result-symbol">{result.symbol}</span>
                      <span className="result-name"> — {result.name}</span>
                    </div>
                    <span className="result-type">{result.type} • {result.exchange}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Market;
