import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiDivide, FiMinus, FiPlus, FiHash, FiCopy, FiCheck, FiTrash2, FiMenu } from 'react-icons/fi';
import { LuTableProperties } from "react-icons/lu";
import './Calculator.css';

const Calculator = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState([]);
  const [copying, setCopying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '0';
    const parts = String(num).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearHistory = () => setHistory([]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const addToHistory = (expr, res) => {
    setHistory(prev => [{ expr, res }, ...prev].slice(0, 20));
  };

  const useHistoryItem = (item) => {
    setDisplay(String(item.res));
    setWaitingForOperand(true);
  };

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operation) {
      const currentValue = prevValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      setPrevValue(newValue);
      setDisplay(String(newValue));
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const applyTax = (type) => {
    const val = parseFloat(display);
    const rate = 0.15; // 15% standard
    let result;
    let expr;

    if (type === 'plus') {
      result = val * (1 + rate);
      expr = `${val} + 15% TAX`;
    } else {
      result = val / (1 + rate);
      expr = `${val} ex. 15% TAX`;
    }
    
    const finalResult = Number(result.toFixed(2));
    setDisplay(String(finalResult));
    addToHistory(expr, finalResult);
  };

  const calculateMargin = () => {
    // Cost / (1 - Margin%)
    // For simplicity, we'll use the display as cost and assume 20% margin if just pressed, 
    // or use it to calculate MU from current display if it follows an operation.
    const val = parseFloat(display);
    const margin = 0.20; // 20% default margin
    const result = val / (1 - margin);
    const finalResult = Number(result.toFixed(2));
    setDisplay(String(finalResult));
    addToHistory(`MU 20% on ${val}`, finalResult);
  };

  const calculate = (prev, next, op) => {
    switch (op) {
      case '+': return prev + next;
      case '-': return prev - next;
      case '*': return prev * next;
      case '/': return prev / next;
      default: return next;
    }
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    if (operation && prevValue !== null) {
      const result = calculate(prevValue, inputValue, operation);
      const expr = `${prevValue} ${operation} ${inputValue}`;
      addToHistory(expr, result);
      
      setDisplay(String(result));
      setPrevValue(null);
      setOperation(null);
      setWaitingForOperand(false);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    if (e.key >= '0' && e.key <= '9') inputDigit(parseInt(e.key));
    if (e.key === '.') inputDot();
    if (e.key === '+') performOperation('+');
    if (e.key === '-') performOperation('-');
    if (e.key === '*') performOperation('*');
    if (e.key === '/') performOperation('/');
    if (e.key === 'Enter' || e.key === '=') handleEquals();
    if (e.key === 'Escape') onClose();
    if (e.key === 'Backspace') {
        setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    }
  }, [display, isOpen, operation, prevValue, waitingForOperand]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="calculator-modal" onClick={onClose}>
      <div className="calculator-container" onClick={e => e.stopPropagation()}>
        <div className="calc-header">
          <div className="calc-header-left">
            <button 
              className={`calc-history-toggle ${showHistory ? 'active' : ''}`} 
              onClick={() => setShowHistory(!showHistory)}
              title="Toggle History"
            >
              <FiMenu size={18} />
            </button>
            <h3><FiHash /> Business Calculator</h3>
          </div>
          <button className="calc-close" onClick={onClose}><FiX size={20} /></button>
        </div>
        
        <div className="calc-main">
          <div className="calc-body">
            <div className="calc-display">
              <button className="calc-copy-btn" onClick={copyToClipboard} title="Copy result">
                {copying ? <FiCheck /> : <FiCopy />}
              </button>
              <div className="calc-prev-value">
                {prevValue !== null ? `${formatNumber(prevValue)} ${operation || ''}` : ''}
              </div>
              <div className="calc-current-value">{formatNumber(display)}</div>
            </div>

            <div className="calc-buttons">
              <button className="calc-btn tax" onClick={() => applyTax('plus')}>TAX+</button>
              <button className="calc-btn tax" onClick={() => applyTax('minus')}>TAX-</button>
              <button className="calc-btn margin" onClick={calculateMargin}>MU</button>
              <button className="calc-btn op" onClick={() => performOperation('/')}>÷</button>

              <button className="calc-btn clear" onClick={clearAll}>AC</button>
              <button className="calc-btn op" onClick={() => setDisplay(String(-parseFloat(display)))}>+/-</button>
              <button className="calc-btn op" onClick={() => setDisplay(String(parseFloat(display) / 100))}>%</button>
              <button className="calc-btn op" onClick={() => performOperation('*')}>×</button>

              <button className="calc-btn" onClick={() => inputDigit(7)}>7</button>
              <button className="calc-btn" onClick={() => inputDigit(8)}>8</button>
              <button className="calc-btn" onClick={() => inputDigit(9)}>9</button>
              <button className="calc-btn op" onClick={() => performOperation('-')}>-</button>

              <button className="calc-btn" onClick={() => inputDigit(4)}>4</button>
              <button className="calc-btn" onClick={() => inputDigit(5)}>5</button>
              <button className="calc-btn" onClick={() => inputDigit(6)}>6</button>
              <button className="calc-btn op" onClick={() => performOperation('+')}>+</button>

              <button className="calc-btn" onClick={() => inputDigit(1)}>1</button>
              <button className="calc-btn" onClick={() => inputDigit(2)}>2</button>
              <button className="calc-btn" onClick={() => inputDigit(3)}>3</button>
              <button className="calc-btn equals" onClick={handleEquals}>=</button>

              <button className="calc-btn span-2" onClick={() => inputDigit(0)}>0</button>
              <button className="calc-btn" onClick={inputDot}>.</button>
            </div>
          </div>

          <div className={`calc-history-sidebar ${showHistory ? 'show' : ''}`}>
            <div className="history-header">
              <span>History</span>
              {history.length > 0 && (
                <button className="clear-history" onClick={clearHistory} title="Clear history">
                  <FiTrash2 size={12} />
                </button>
              )}
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="history-empty">No history yet</div>
              ) : (
                history.map((item, index) => (
                  <div key={index} className="history-item" onClick={() => useHistoryItem(item)}>
                    <span className="history-expr">
                      {item.expr.split(' ').map(word => !isNaN(word) ? formatNumber(word) : word).join(' ')} =
                    </span>
                    <span className="history-res">{formatNumber(item.res)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
