import React, { useState, useEffect } from 'react';
import { CloseIcon, RefreshIcon, TrendingUpIcon } from './CustomIcons';
import { useSettings } from '../contexts/SettingsContext';
import './CurrencyConverter.css';

const CurrencyConverter = ({ isOpen, onClose }) => {
  const { currencySymbol } = useSettings();
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isApproximate, setIsApproximate] = useState(false);

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' }
  ];

  const fetchRates = async () => {
    setLoading(true);
    // Frankfurter supported currencies
    const supported = ['USD', 'EUR', 'GBP', 'CAD', 'CNY', 'INR', 'JPY', 'AUD', 'CHF', 'HKD', 'SGD', 'ZAR'];
    
    try {
      if (fromCurrency === toCurrency) {
        setExchangeRate(1);
        setIsApproximate(false);
        setLoading(false);
        return;
      }

      if (!supported.includes(fromCurrency) || !supported.includes(toCurrency)) {
        throw new Error('Unsupported currency for API');
      }

      // Using Frankfurter API (No key required for basic use)
      const response = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`);
      
      if (!response.ok) {
        throw new Error('Currency not supported by API');
      }

      const data = await response.json();
      if (data.rates && data.rates[toCurrency]) {
        setExchangeRate(data.rates[toCurrency]);
        setIsApproximate(false);
      }
    } catch (error) {
      console.warn('Currency API Error (likely unsupported currency):', error.message);
      setIsApproximate(true);
      // Fallback pseudo-rates (Approximations for unsupported currencies like NGN)
      const fallbacks = { 
        'USD-NGN': 1600, 'NGN-USD': 0.00062,
        'USD-AED': 3.67, 'AED-USD': 0.27,
        'EUR-NGN': 1750, 'NGN-EUR': 0.00057,
        'GBP-NGN': 2000, 'NGN-GBP': 0.0005
      };
      setExchangeRate(fallbacks[`${fromCurrency}-${toCurrency}`] || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRates();
  }, [fromCurrency, toCurrency, isOpen]);

  useEffect(() => {
    if (exchangeRate && amount) {
      setResult((parseFloat(amount) * exchangeRate).toFixed(2));
    } else {
      setResult(null);
    }
  }, [amount, exchangeRate]);

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  if (!isOpen) return null;

  return (
    <div className="currency-modal" onClick={onClose}>
      <div className="currency-container" onClick={e => e.stopPropagation()}>
        <div className="currency-header">
          <h3><span className="currency-icon-text">{currencySymbol}</span> Currency Converter</h3>
          <button className="currency-close" onClick={onClose}><CloseIcon size={20} /></button>
        </div>

        <div className="currency-content">
          <div className={`rate-info ${isApproximate ? 'approx' : ''}`}>
            {loading ? 'Fetching live rates...' : `1 ${fromCurrency} = ${formatNumber(exchangeRate)} ${toCurrency}`}
            {isApproximate && !loading && <span className="approx-tag" title="Rate not available on API, using approximate fallback">Approx.</span>}
          </div>

          <div className="curr-input-group">
            <label>Amount</label>
            <div className="curr-row">
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>

          <div className="curr-divider">
            <button className="curr-swap-btn" onClick={swapCurrencies} title="Swap Currencies">
              <RefreshIcon size={16} />
            </button>
          </div>

          <div className="curr-input-group res">
            <label>Converted Result</label>
            <div className="curr-row">
              <div className="curr-res-display">
                {result ? formatNumber(result) : '0.00'}
              </div>
              <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="currency-footer">
          <p><TrendingUpIcon size={12} /> Live rates provided by Frankfurter API</p>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;
