import React, { useState } from 'react';
import { FiBell, FiDatabase, FiSave, FiMoon, FiRefreshCw } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import api from '../api';

const Settings = () => {
  const {
    settings,
    updateSettings,
    saveSettings,
    saving,
    loading,
    error
  } = useSettings();

  const [saved, setSaved] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(null);
  const [migrationResult, setMigrationResult] = useState(null);

  const handleToggle = (category, setting) => {
    updateSettings({
      [category]: {
        [setting]: !settings[category][setting]
      }
    });
    setSaved(false);
  };

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleNormalizeSortingCodes = async () => {
    if (migrating) return;
    
    const confirmed = window.confirm(
      'This will update all product sorting codes to the new format.\n\n' +
      'New format: First letters of brand + First 2 letters of first product word + First letter of other product words + Volume digits\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    setMigrating(true);
    setMigrationProgress(null);
    setMigrationResult(null);
    
    try {
      const result = await api.normalizeSortingCodes((progress) => {
        setMigrationProgress(progress);
      });
      
      setMigrationResult({
        success: true,
        message: `Updated ${result.updated} products, ${result.skipped} unchanged`
      });
    } catch (err) {
      setMigrationResult({
        success: false,
        message: err.message || 'Migration failed'
      });
    } finally {
      setMigrating(false);
    }
  };

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: '44px',
        height: '24px',
        borderRadius: '12px',
        background: checked ? '#0A0A0A' : '#E5E5E5',
        border: 'none',
        padding: '2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.2s'
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'white',
        transform: checked ? 'translateX(20px)' : 'translateX(0)',
        transition: 'transform 0.2s'
      }} />
    </button>
  );

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">Configure your application preferences</p>
        </div>
      </div>

      {error && (
        <div className="card" style={{ padding: '12px 16px', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--danger-text)', marginTop: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '24px', marginTop: '24px', maxWidth: '800px' }}>
        {/* Notifications */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--info-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info-text)'
            }}>
              <FiBell size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Notifications</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Manage your notification preferences</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Email Alerts</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Receive important updates via email</p>
              </div>
              <Toggle checked={settings.notifications.emailAlerts} onChange={() => handleToggle('notifications', 'emailAlerts')} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Low Stock Alerts</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Get notified when products are running low</p>
              </div>
              <Toggle checked={settings.notifications.lowStockAlerts} onChange={() => handleToggle('notifications', 'lowStockAlerts')} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Order Notifications</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Receive alerts for new orders</p>
              </div>
              <Toggle checked={settings.notifications.orderAlerts} onChange={() => handleToggle('notifications', 'orderAlerts')} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Weekly Reports</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Receive weekly summary reports</p>
              </div>
              <Toggle checked={settings.notifications.weeklyReports} onChange={() => handleToggle('notifications', 'weeklyReports')} disabled={loading} />
            </div>
          </div>
        </div>

        {/* Display */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--warning-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--warning-text)'
            }}>
              <FiMoon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Display</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Customize your display preferences</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Dark Mode</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Use the dark color theme</p>
              </div>
              <Toggle checked={settings.display.darkMode} onChange={() => handleToggle('display', 'darkMode')} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Compact View</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Show more items in less space</p>
              </div>
              <Toggle checked={settings.display.compactView} onChange={() => handleToggle('display', 'compactView')} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Currency</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Select your preferred currency</p>
              </div>
              <select
                value={settings.display.currency}
                onChange={(e) => updateSettings({ display: { currency: e.target.value } })}
                style={{ width: 'auto', padding: '8px 16px' }}
                disabled={loading}
              >
                <option value="NGN">₦ Nigerian Naira</option>
                <option value="USD">$ US Dollar</option>
                <option value="EUR">€ Euro</option>
                <option value="GBP">£ British Pound</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--success-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--success-text)'
            }}>
              <FiDatabase size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Inventory</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Configure inventory settings</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Low Stock Threshold</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Items below this quantity trigger alerts</p>
              </div>
              <input
                type="number"
                value={settings.inventory.lowStockThreshold}
                onChange={(e) => {
                  const val = e.target.value;
                  updateSettings({ inventory: { lowStockThreshold: val === "" ? "" : Number(val) } });
                }}
                style={{ width: '80px', textAlign: 'center' }}
                disabled={loading}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Auto Reorder</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Automatically create reorder requests</p>
              </div>
              <Toggle checked={settings.inventory.autoReorder} onChange={() => handleToggle('inventory', 'autoReorder')} disabled={loading} />
            </div>
          </div>
        </div>

        {/* Data Migration */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--info-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--info-text)'
            }}>
              <FiRefreshCw size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Data Migration</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Update existing data to new formats</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <p style={{ margin: 0, fontWeight: 500 }}>Normalize Sorting Codes</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>
                  Update all product sorting codes to use the new format (Brand initials + First 2 letters of product + Other initials + Volume)
                </p>
              </div>
              <button
                onClick={handleNormalizeSortingCodes}
                disabled={migrating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: migrating ? '#666' : '#0A0A0A',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: migrating ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <FiRefreshCw size={14} style={{ animation: migrating ? 'spin 1s linear infinite' : 'none' }} />
                {migrating ? 'Migrating...' : 'Run Migration'}
              </button>
            </div>
            
            {migrationProgress && migrating && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--bg-tertiary)', 
                borderRadius: '8px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Progress: {migrationProgress.current} / {migrationProgress.total}</span>
                  <span>{migrationProgress.updated} updated</span>
                </div>
                <div style={{ 
                  height: '4px', 
                  background: 'var(--border-color)', 
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                    background: 'var(--success-text)',
                    transition: 'width 0.2s'
                  }} />
                </div>
              </div>
            )}
            
            {migrationResult && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px',
                background: migrationResult.success ? 'var(--success-bg)' : 'var(--danger-bg)',
                color: migrationResult.success ? 'var(--success-text)' : 'var(--danger-text)',
                fontSize: '13px'
              }}>
                {migrationResult.message}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ 
        marginTop: '32px', 
        paddingTop: '24px', 
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button 
          onClick={handleSave} 
          disabled={saving || loading}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: 500,
            background: saved ? '#00B074' : '#0A0A0A',
            borderRadius: '50px',
            opacity: saving || loading ? 0.7 : 1,
            cursor: saving || loading ? 'not-allowed' : 'pointer'
          }}
        >
          <FiSave size={14} /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
