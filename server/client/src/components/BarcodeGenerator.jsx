import React, { useState, useRef } from 'react';
import { CloseIcon, DownloadIcon, MaximizeIcon, CpuIcon } from './CustomIcons';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import './BarcodeGenerator.css';

const BarcodeGenerator = ({ isOpen, onClose }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState('QR'); // QR or Barcode
  const resultRef = useRef(null);

  const downloadAsset = () => {
    if (!resultRef.current) return;
    
    const svg = resultRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width * 2; // High res
      canvas.height = img.height * 2;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngFile = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${type}-${text || 'asset'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (!isOpen) return null;

  return (
    <div className="barcode-modal" onClick={onClose}>
      <div className="barcode-container" onClick={e => e.stopPropagation()}>
        <div className="barcode-header">
          <h3><CpuIcon size={18} /> Asset Tag Generator</h3>
          <button className="barcode-close" onClick={onClose}><CloseIcon size={20} /></button>
        </div>

        <div className="barcode-content">
          <div className="barcode-input-section">
            <label>SKU / Serial Number / Text</label>
            <input 
              type="text" 
              value={text} 
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. RYME-2024-001"
              autoFocus
            />
          </div>

          <div className="type-selector">
            <button 
              className={type === 'QR' ? 'active' : ''} 
              onClick={() => setType('QR')}
            >
              QR Code
            </button>
            <button 
              className={type === 'Barcode' ? 'active' : ''} 
              onClick={() => setType('Barcode')}
            >
              Barcode
            </button>
          </div>

          <div className="result-display" ref={resultRef}>
            {text ? (
              <div className="asset-tag">
                {type === 'QR' ? (
                  <QRCodeSVG 
                    value={text} 
                    size={200} 
                    level={"H"}
                    includeMargin={true}
                  />
                ) : (
                  <Barcode 
                    value={text} 
                    width={1.5} 
                    height={80} 
                    fontSize={14}
                    background="#ffffff"
                  />
                )}
                <p className="tag-label">{text}</p>
              </div>
            ) : (
              <div className="result-placeholder">
                <MaximizeIcon size={40} />
                <p>Enter text to generate code</p>
              </div>
            )}
          </div>

          {text && (
            <button className="btn-download" onClick={downloadAsset}>
              <DownloadIcon size={16} /> Download PNG
            </button>
          )}
        </div>

        <div className="barcode-footer">
          <p>Use for inventory labels and shipping boxes</p>
        </div>
      </div>
    </div>
  );
};

export default BarcodeGenerator;
