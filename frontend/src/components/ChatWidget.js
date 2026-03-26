import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './ChatWidget.css';

const API_URL = 'http://localhost:8000';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chatbot/query`, {
        query: text,
        conversation_history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className={`chat-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="AI Financial Assistant"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <div className="chat-widget-title">
              <span className="chat-widget-icon">🤖</span>
              <div>
                <h4>Pocket Buddy AI</h4>
                <span className="chat-widget-status">Online</span>
              </div>
            </div>
            <button className="chat-widget-close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="chat-widget-messages">
            {messages.length === 0 && (
              <div className="chat-widget-welcome">
                <p>👋 Hi {user?.full_name?.split(' ')[0]}!</p>
                <p>Ask me anything about finances.</p>
                <div className="chat-widget-chips">
                  <button onClick={() => sendMessage('Best investment options?')}>💰 Investments</button>
                  <button onClick={() => sendMessage('How should I start a SIP?')}>📊 SIP</button>
                  <button onClick={() => sendMessage('Tax saving tips')}>🧾 Tax</button>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-widget-msg ${msg.role}`}>
                <div className="chat-widget-bubble">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-widget-msg assistant">
                <div className="chat-widget-bubble">
                  <div className="chat-widget-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-widget-input" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>➤</button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
