import React, { useState, useEffect } from 'react';
import { FiX, FiRefreshCw, FiLayers } from 'react-icons/fi';
import './UnitConverter.css';

const UnitConverter = ({ isOpen, onClose }) => {
  const [value, setValue] = useState('');
  const [fromUnit, setFromUnit] = useState('in');
  const [toUnit, setToUnit] = useState('cm');
  const [result, setResult] = useState(null);

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === '') return '0';
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 4
    }).format(num);
  };

  const categories = {
    length: [
      { id: 'in', label: 'Inches', factor: 0.0254 },
      { id: 'cm', label: 'Centimeters', factor: 0.01 },
      { id: 'ft', label: 'Feet', factor: 0.3048 },
      { id: 'm', label: 'Meters', factor: 1 },
      { id: 'mm', label: 'Millimeters', factor: 0.001 }
    ],
    area: [
      { id: 'sqft', label: 'Sq. Feet', factor: 0.092903 },
      { id: 'sqm', label: 'Sq. Meters', factor: 1 },
      { id: 'sqin', label: 'Sq. Inches', factor: 0.00064516 }
    ],
    weight: [
      { id: 'kg', label: 'Kilograms', factor: 1 },
      { id: 'lb', label: 'Pounds', factor: 0.453592 },
      { id: 'oz', label: 'Ounces', factor: 0.0283495 }
    ],
    volume: [
      { id: 'ml', label: 'Milliliters', factor: 1 },
      { id: 'l', label: 'Liters', factor: 1000 },
      { id: 'floz', label: 'Fluid Oz', factor: 29.5735 }
    ],
    glass: [
      { id: 'ml', label: 'Glass Vol (ml)', factor: 1 },
      { id: 'g', label: 'Mass (g)', factor: 1 / 2.52 },
      { id: 'kg', label: 'Mass (kg)', factor: 1000 / 2.52 }
    ],
    oil: [
      { id: 'ml', label: 'Oil Vol (ml)', factor: 1 },
      { id: 'g', label: 'Mass (g)', factor: 1 / 0.9 },
      { id: 'kg', label: 'Mass (kg)', factor: 1000 / 0.9 }
    ]
  };

  const [activeCategory, setActiveCategory] = useState('length');

  useEffect(() => {
    // Reset units when category changes
    const defaultUnits = categories[activeCategory];
    setFromUnit(defaultUnits[0].id);
    setToUnit(defaultUnits[1].id);
  }, [activeCategory]);

  const convert = (val, from, to) => {
    if (!val || isNaN(val)) return null;
    const units = categories[activeCategory];
    const fromFactor = units.find(u => u.id === from).factor;
    const toFactor = units.find(u => u.id === to).factor;
    
    // Convert to base (meters/sqm/kg) then to target
    const baseValue = val * fromFactor;
    const targetValue = baseValue / toFactor;
    
    return Number(targetValue.toFixed(4));
  };

  useEffect(() => {
    const res = convert(parseFloat(value), fromUnit, toUnit);
    setResult(res);
  }, [value, fromUnit, toUnit, activeCategory]);

  const swapUnits = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  if (!isOpen) return null;

  return (
    <div className="unit-modal" onClick={onClose}>
      <div className="unit-container" onClick={e => e.stopPropagation()}>
        <div className="unit-header">
          <h3><FiRefreshCw /> Unit Converter</h3>
          <button className="unit-close" onClick={onClose}><FiX size={20} /></button>
        </div>

        <div className="unit-tabs">
          {Object.keys(categories).map(cat => (
            <button 
              key={cat} 
              className={`unit-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="unit-content">
          <div className="unit-input-group">
            <label>From</label>
            <div className="unit-row">
              <input 
                type="number" 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
              <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)}>
                {categories[activeCategory].map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="unit-divider">
            <button className="swap-btn" onClick={swapUnits}>
              <FiLayers />
            </button>
          </div>

          <div className="unit-input-group res">
            <label>To</label>
            <div className="unit-row">
              <div className="unit-res-display">
                {result ? formatNumber(result) : '0'}
              </div>
              <select value={toUnit} onChange={(e) => setToUnit(e.target.value)}>
                {categories[activeCategory].map(u => (
                  <option key={u.id} value={u.id}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="unit-footer">
          <p>Quick conversion for interiors & logistics</p>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
