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

export const SkeletonStatCard = () => (
  <div className="stat-widget skeleton-stat">
    <div className="skeleton" style={{ width: '60%', height: 12, marginBottom: 12 }} />
    <div className="skeleton" style={{ width: '45%', height: 28, marginBottom: 8 }} />
    <div className="skeleton" style={{ width: '70%', height: 10 }} />
  </div>
);

export const SkeletonStatsGrid = ({ count = 4 }) => (
  <div className="stats-grid bento-grid">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonStatCard key={i} />
    ))}
  </div>
);

export const SkeletonCard = ({ lines = 3, height }) => (
  <div className="card skeleton-card">
    <div className="skeleton" style={{ width: '50%', height: 18, marginBottom: 16 }} />
    {height ? (
      <div className="skeleton" style={{ width: '100%', height }} />
    ) : (
      Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width: i === lines - 1 ? '60%' : '100%', height: 14, marginBottom: 10 }} />
      ))
    )}
  </div>
);

export const SkeletonOrderCard = () => (
  <div className="skeleton-order-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <div className="skeleton" style={{ width: '50%', height: 14 }} />
      <div className="skeleton" style={{ width: '20%', height: 14, borderRadius: 4 }} />
    </div>
    <div className="skeleton" style={{ width: '35%', height: 10, marginBottom: 6 }} />
    <div className="skeleton" style={{ width: '45%', height: 10, marginBottom: 12 }} />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div className="skeleton" style={{ width: '30%', height: 16 }} />
      <div className="skeleton" style={{ width: '25%', height: 16 }} />
    </div>
  </div>
);

export const SkeletonOrderCardList = ({ count = 3 }) => (
  <div className="orders-list-mobile mobile-only">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonOrderCard key={i} />
    ))}
  </div>
);

export default { SkeletonLine, SkeletonBlock, SkeletonTable, SkeletonStatCard, SkeletonStatsGrid, SkeletonCard, SkeletonOrderCard, SkeletonOrderCardList };
