import React, { useState, useEffect } from 'react';
import { CloseIcon, EditIcon, DeleteIcon, CopyIcon, CheckIcon } from './CustomIcons';
import './QuickScratchpad.css';

const QuickScratchpad = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState('');
  const [copying, setCopying] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('ryme_scratchpad_notes');
    if (savedNotes) setNotes(savedNotes);
  }, []);

  // Save to localStorage whenever notes change
  const handleNoteChange = (e) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    localStorage.setItem('ryme_scratchpad_notes', newNotes);
  };

  const clearNotes = () => {
    if (window.confirm('Clear all notes?')) {
      setNotes('');
      localStorage.removeItem('ryme_scratchpad_notes');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(notes);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="scratchpad-overlay" onClick={onClose}>
      <div className="scratchpad-container" onClick={e => e.stopPropagation()}>
        <div className="scratchpad-header">
          <div className="header-title">
            <EditIcon className="header-icon" size={18} />
            <h3>Quick Scratchpad</h3>
          </div>
          <div className="header-actions">
            <button 
              className={`action-btn copy ${copying ? 'success' : ''}`} 
              onClick={copyToClipboard}
              disabled={!notes}
              title="Copy to clipboard"
            >
              {copying ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </button>
            <button 
              className="action-btn delete" 
              onClick={clearNotes}
              disabled={!notes}
              title="Clear notes"
            >
              <DeleteIcon size={16} />
            </button>
            <button className="scratchpad-close" onClick={onClose}>
              <CloseIcon size={20} />
            </button>
          </div>
        </div>

        <div className="scratchpad-body">
          <textarea
            value={notes}
            onChange={handleNoteChange}
            placeholder="Type your temporary notes, dimensions, or SKUs here... (Auto-saves automatically)"
            spellCheck="false"
            autoFocus
          />
        </div>

        <div className="scratchpad-footer">
          <span>Notes are saved locally on this device.</span>
          <span>{notes.length} characters</span>
        </div>
      </div>
    </div>
  );
};

export default QuickScratchpad;
