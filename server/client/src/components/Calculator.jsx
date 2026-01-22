import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiDivide, FiMinus, FiPlus, FiHash } from 'react-icons/fi';
import { LuTableProperties } from "react-icons/lu";
import './Calculator.css';

const Calculator = ({ isOpen, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const clearAll = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperation(null);
    setWaitingForOperand(false);
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
          <h3><FiHash /> Business Calculator</h3>
          <button className="calc-close" onClick={onClose}><FiX size={20} /></button>
        </div>
        
        <div className="calc-display">
          <div className="calc-prev-value">
            {prevValue !== null ? `${prevValue} ${operation || ''}` : ''}
          </div>
          <div className="calc-current-value">{display}</div>
        </div>

        <div className="calc-buttons">
          <button className="calc-btn clear" onClick={clearAll}>AC</button>
          <button className="calc-btn op" onClick={() => setDisplay(String(-parseFloat(display)))}>+/-</button>
          <button className="calc-btn op" onClick={() => setDisplay(String(parseFloat(display) / 100))}>%</button>
          <button className="calc-btn op" onClick={() => performOperation('/')}>÷</button>

          <button className="calc-btn" onClick={() => inputDigit(7)}>7</button>
          <button className="calc-btn" onClick={() => inputDigit(8)}>8</button>
          <button className="calc-btn" onClick={() => inputDigit(9)}>9</button>
          <button className="calc-btn op" onClick={() => performOperation('*')}>×</button>

          <button className="calc-btn" onClick={() => inputDigit(4)}>4</button>
          <button className="calc-btn" onClick={() => inputDigit(5)}>5</button>
          <button className="calc-btn" onClick={() => inputDigit(6)}>6</button>
          <button className="calc-btn op" onClick={() => performOperation('-')}>−</button>

          <button className="calc-btn" onClick={() => inputDigit(1)}>1</button>
          <button className="calc-btn" onClick={() => inputDigit(2)}>2</button>
          <button className="calc-btn" onClick={() => inputDigit(3)}>3</button>
          <button className="calc-btn op" onClick={() => performOperation('+')}>+</button>

          <button className="calc-btn zero" onClick={() => inputDigit(0)}>0</button>
          <button className="calc-btn" onClick={inputDot}>.</button>
          <button className="calc-btn equals" onClick={handleEquals}>=</button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
