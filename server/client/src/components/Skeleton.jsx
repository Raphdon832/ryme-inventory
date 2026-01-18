import React from 'react';

export const SkeletonLine = ({ width = '100%', style }) => (
  <div className="skeleton skeleton-line" style={{ width, ...style }} />
);

export const SkeletonBlock = ({ height = 120, style }) => (
  <div className="skeleton skeleton-block" style={{ height, ...style }} />
);

export const SkeletonTable = ({ rows = 6, cols = 5 }) => (
  <div className="card" style={{ overflow: 'hidden' }}>
    <div className="skeleton" style={{ height: 32, margin: '16px', borderRadius: 8, width: '40%' }} />
    <div className="table-container">
      <table className="skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><div className="skeleton" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><div className="skeleton" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default { SkeletonLine, SkeletonBlock, SkeletonTable };
