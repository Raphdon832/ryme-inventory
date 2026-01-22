import React, { useState, useEffect } from 'react';
import { FiX, FiPieChart, FiArrowUpRight, FiPercent, FiRefreshCcw } from 'react-icons/fi';
import './PricingSimulator.css';

const PricingSimulator = ({ isOpen, onClose }) => {
  const [cost, setCost] = useState('1000');
  const [markupType, setMarkupType] = useState('percent'); // percent or fixed
  const [markupValue, setMarkupValue] = useState('30');
  const [discount, setDiscount] = useState('5');
  
  const [stats, setStats] = useState({
    sellingPrice: 0,
    profit: 0,
    margin: 0,
    finalPrice: 0,
    netProfit: 0
  });

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(num);
  };

  useEffect(() => {
    const c = parseFloat(cost) || 0;
    const mv = parseFloat(markupValue) || 0;
    const dv = parseFloat(discount) || 0;
    
    let sp = 0;
    if (markupType === 'percent') {
      sp = c * (1 + mv/100);
    } else {
      sp = c + mv;
    }
    
    const profit = sp - c;
    const margin = sp > 0 ? (profit / sp) * 100 : 0;
    
    const discAmount = sp * (dv / 100);
    const finalPrice = sp - discAmount;
    const netProfit = finalPrice - c;
    
    setStats({
      sellingPrice: sp.toFixed(2),
      profit: profit.toFixed(2),
      margin: margin.toFixed(1),
      finalPrice: finalPrice.toFixed(2),
      netProfit: netProfit.toFixed(2)
    });
  }, [cost, markupValue, markupType, discount]);

  if (!isOpen) return null;

  return (
    <div className="pricing-modal" onClick={onClose}>
      <div className="pricing-container" onClick={e => e.stopPropagation()}>
        <div className="pricing-header">
          <h3><FiPieChart /> Pricing & Markup Simulator</h3>
          <button className="pricing-close" onClick={onClose}><FiX size={20} /></button>
        </div>

        <div className="pricing-content">
          <div className="input-grid">
            <div className="input-field">
              <label>Cost Price</label>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
            </div>
            
            <div className="input-field">
              <label>Markup ({markupType === 'percent' ? '%' : 'Fixed'})</label>
              <div className="markup-input-group">
                <input type="number" value={markupValue} onChange={(e) => setMarkupValue(e.target.value)} />
                <button 
                  onClick={() => setMarkupType(markupType === 'percent' ? 'fixed' : 'percent')}
                  title="Toggle Markup Type"
                >
                  <FiRefreshCcw size={14} />
                </button>
              </div>
            </div>

            <div className="input-field">
              <label>Discount (%)</label>
              <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
          </div>

          <div className="results-grid">
            <div className="result-card primary">
              <span className="res-label">Base Selling Price</span>
              <span className="res-value">₦{formatNumber(stats.sellingPrice)}</span>
            </div>
            
            <div className="result-card secondary highlighting">
              <span className="res-label">Final Price (After Discount)</span>
              <span className="res-value highlight">₦{formatNumber(stats.finalPrice)}</span>
            </div>

            <div className="stats-row">
              <div className="stat-pill">
                <FiArrowUpRight size={14} color="#10b981" />
                <span>Profit: <b>₦{formatNumber(stats.netProfit)}</b></span>
              </div>
              <div className="stat-pill">
                <FiPercent size={14} color="#3b82f6" />
                <span>Margin: <b>{stats.margin}%</b></span>
              </div>
            </div>
          </div>

          <div className="profit-analysis">
            <div className="analysis-bar">
              <div className="bar-cost" style={{ width: '60%' }}></div>
              <div className="bar-profit" style={{ width: '40%' }}></div>
            </div>
            <div className="analysis-legend">
              <span><i className="dot cost"></i> Cost</span>
              <span><i className="dot profit"></i> Net Profit</span>
            </div>
          </div>
        </div>

        <div className="pricing-footer">
          <p>Simulation for bulk orders and project estimates</p>
        </div>
      </div>
    </div>
  );
};

export default PricingSimulator;
