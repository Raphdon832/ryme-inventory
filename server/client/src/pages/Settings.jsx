import React, { useState, useEffect } from 'react';
import { FiBell, FiDatabase, FiSave, FiMoon, FiRefreshCw, FiVolume2, FiPlay, FiNavigation, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import { AVAILABLE_NAV_OPTIONS, ICON_MAP } from '../components/QuickNavBar';
import api from '../api';
import soundManager from '../utils/soundManager';
import './Settings.css';

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
  
  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(soundManager.enabled);
  const [soundVolume, setSoundVolume] = useState(soundManager.volume);
  
  // Quick Navigation state
  const [showNavPicker, setShowNavPicker] = useState(false);
  const quickNavItems = settings.quickNav?.items || [];

  // Sync sound settings on mount
  useEffect(() => {
    setSoundEnabled(soundManager.enabled);
    setSoundVolume(soundManager.volume);
  }, []);

  const handleSoundToggle = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    soundManager.setEnabled(newValue);
    if (newValue) {
      soundManager.playNotification();
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setSoundVolume(newVolume);
    soundManager.setVolume(newVolume);
  };

  const testSound = (type) => {
    switch (type) {
      case 'success':
        soundManager.playSuccess();
        break;
      case 'sync':
        soundManager.playSync();
        break;
      case 'error':
        soundManager.playError();
        break;
      case 'lowStock':
        soundManager.playLowStockAlert();
        break;
      default:
        soundManager.playNotification();
    }
  };

  const handleToggle = (category, setting) => {
    updateSettings({
      [category]: {
        [setting]: !settings[category][setting]
      }
    });
    setSaved(false);
  };
  
  // Quick Navigation handlers
  const handleQuickNavToggle = () => {
    updateSettings({
      quickNav: {
        enabled: !settings.quickNav?.enabled
      }
    });
    setSaved(false);
  };
  
  const addQuickNavItem = (item) => {
    if (quickNavItems.length >= 5) return;
    if (quickNavItems.find(i => i.id === item.id)) return;
    
    updateSettings({
      quickNav: {
        items: [...quickNavItems, item]
      }
    });
    setSaved(false);
    setShowNavPicker(false);
  };
  
  const removeQuickNavItem = (itemId) => {
    updateSettings({
      quickNav: {
        items: quickNavItems.filter(i => i.id !== itemId)
      }
    });
    setSaved(false);
  };
  
  const moveQuickNavItem = (index, direction) => {
    const newItems = [...quickNavItems];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newItems.length) return;
    
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    updateSettings({
      quickNav: {
        items: newItems
      }
    });
    setSaved(false);
  };
  
  const availableOptions = AVAILABLE_NAV_OPTIONS.filter(
    opt => !quickNavItems.find(item => item.id === opt.id)
  );

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
        background: checked ? 'var(--text-primary)' : 'var(--bg-tertiary)',
        border: 'none',
        padding: '2px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    >
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'var(--bg-primary)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'all 0.2s',
        flexShrink: 0
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Appearance</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Choose your preferred theme</p>
              </div>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '4px' }}>
                <button
                  onClick={() => updateSettings({ display: { darkMode: 'light' } })}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: settings.display.darkMode === 'light' ? 'var(--bg-primary)' : 'transparent',
                    color: settings.display.darkMode === 'light' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: settings.display.darkMode === 'light' ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: settings.display.darkMode === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Light
                </button>
                <button
                  onClick={() => updateSettings({ display: { darkMode: 'dark' } })}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: settings.display.darkMode === 'dark' ? 'var(--bg-primary)' : 'transparent',
                    color: settings.display.darkMode === 'dark' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: settings.display.darkMode === 'dark' ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: settings.display.darkMode === 'dark' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Dark
                </button>
                <button
                  onClick={() => updateSettings({ display: { darkMode: 'auto' } })}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: settings.display.darkMode === 'auto' ? 'var(--bg-primary)' : 'transparent',
                    color: settings.display.darkMode === 'auto' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    fontWeight: settings.display.darkMode === 'auto' ? 600 : 400,
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: settings.display.darkMode === 'auto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Auto
                </button>
              </div>
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

        {/* Quick Navigation - Mobile */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FiNavigation size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Quick Navigation</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Customize bottom navbar for mobile (max 5 items)</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Enable Quick Navigation</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Show bottom navbar on mobile for quick access</p>
              </div>
              <Toggle checked={settings.quickNav?.enabled || false} onChange={handleQuickNavToggle} disabled={loading} />
            </div>

            {settings.quickNav?.enabled && (
              <>
                <div style={{ padding: '12px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>Navigation Items ({quickNavItems.length}/5)</p>
                    {quickNavItems.length < 5 && (
                      <button
                        onClick={() => setShowNavPicker(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <FiPlus size={14} /> Add Item
                      </button>
                    )}
                  </div>

                  {/* Current Items */}
                  {quickNavItems.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: '10px',
                      textAlign: 'center',
                      color: 'var(--text-tertiary)',
                      fontSize: '13px'
                    }}>
                      No navigation items added yet. Click "Add Item" to get started.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {quickNavItems.map((item, index) => {
                        const IconComponent = ICON_MAP[item.icon];
                        return (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px 12px',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '10px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(79, 106, 245, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--primary-color)'
                            }}>
                              {IconComponent && <IconComponent size={16} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>{item.label}</p>
                              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-tertiary)' }}>{item.path}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => moveQuickNavItem(index, -1)}
                                disabled={index === 0}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-surface)',
                                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                                  opacity: index === 0 ? 0.4 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px'
                                }}
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveQuickNavItem(index, 1)}
                                disabled={index === quickNavItems.length - 1}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color)',
                                  background: 'var(--bg-surface)',
                                  cursor: index === quickNavItems.length - 1 ? 'not-allowed' : 'pointer',
                                  opacity: index === quickNavItems.length - 1 ? 0.4 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px'
                                }}
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => removeQuickNavItem(item.id)}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                <FiX size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Item Picker Modal */}
                {showNavPicker && (
                  <div 
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(4px)',
                      zIndex: 1000,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px'
                    }}
                    onClick={() => setShowNavPicker(false)}
                  >
                    <div 
                      style={{
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '400px',
                        maxHeight: '70vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <h3 style={{ margin: 0 }}>Add Navigation Item</h3>
                        <button
                          onClick={() => setShowNavPicker(false)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--bg-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <FiX size={18} />
                        </button>
                      </div>
                      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
                        {availableOptions.length === 0 ? (
                          <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            fontSize: '13px'
                          }}>
                            All available options have been added.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {availableOptions.map((option) => {
                              const IconComponent = ICON_MAP[option.icon];
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => addQuickNavItem(option)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.15s'
                                  }}
                                >
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: 'rgba(79, 106, 245, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary-color)'
                                  }}>
                                    {IconComponent && <IconComponent size={18} />}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{option.label}</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>{option.path}</p>
                                  </div>
                                  <FiPlus size={18} style={{ color: 'var(--text-tertiary)' }} />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
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

        {/* Sound Settings */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <FiVolume2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0 }}>Sound Notifications</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Configure audio feedback for app events</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Enable Sounds</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Play audio notifications for app events</p>
              </div>
              <Toggle checked={soundEnabled} onChange={handleSoundToggle} disabled={loading} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>Volume</p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>Adjust notification sound volume</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={handleVolumeChange}
                  onMouseUp={() => soundManager.playNotification()}
                  onTouchEnd={() => soundManager.playNotification()}
                  disabled={!soundEnabled}
                  className="settings-volume-slider"
                />
                <span style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-tertiary)',
                  minWidth: '35px'
                }}>
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
            </div>

            <div style={{ padding: '12px 0' }}>
              <p style={{ margin: '0 0 12px 0', fontWeight: 500 }}>Test Sounds</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => testSound('success')}
                  disabled={!soundEnabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: soundEnabled ? '#00B074' : '#888',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: soundEnabled ? 'pointer' : 'not-allowed',
                    opacity: soundEnabled ? 1 : 0.5
                  }}
                >
                  <FiPlay size={12} /> Success
                </button>
                <button
                  onClick={() => testSound('sync')}
                  disabled={!soundEnabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: soundEnabled ? '#3B82F6' : '#888',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: soundEnabled ? 'pointer' : 'not-allowed',
                    opacity: soundEnabled ? 1 : 0.5
                  }}
                >
                  <FiPlay size={12} /> Sync Complete
                </button>
                <button
                  onClick={() => testSound('error')}
                  disabled={!soundEnabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: soundEnabled ? '#EF4444' : '#888',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: soundEnabled ? 'pointer' : 'not-allowed',
                    opacity: soundEnabled ? 1 : 0.5
                  }}
                >
                  <FiPlay size={12} /> Error
                </button>
                <button
                  onClick={() => testSound('lowStock')}
                  disabled={!soundEnabled}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: soundEnabled ? '#F59E0B' : '#888',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: soundEnabled ? 'pointer' : 'not-allowed',
                    opacity: soundEnabled ? 1 : 0.5
                  }}
                >
                  <FiPlay size={12} /> Low Stock
                </button>
              </div>
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
