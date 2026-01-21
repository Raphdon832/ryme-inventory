import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api';

const defaultSettings = {
  notifications: {
    emailAlerts: true,
    lowStockAlerts: true,
    orderAlerts: true,
    weeklyReports: false
  },
  display: {
    darkMode: false,
    compactView: false,
    currency: 'NGN'
  },
  inventory: {
    lowStockThreshold: 10,
    autoReorder: false
  },
  quickNav: {
    enabled: false,
    items: [] // Array of { id, path, icon, label } - max 5 items
  }
};

const CURRENCY_META = {
  NGN: { symbol: '₦', locale: 'en-NG' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' }
};

const settingsRef = doc(db, 'app_settings', 'general');

const mergeSettings = (base, incoming) => ({
  notifications: { ...base.notifications, ...(incoming?.notifications || {}) },
  display: { ...base.display, ...(incoming?.display || {}) },
  inventory: { ...base.inventory, ...(incoming?.inventory || {}) },
  quickNav: { ...base.quickNav, ...(incoming?.quickNav || {}) }
});

const safeLoadLocal = () => {
  try {
    const raw = localStorage.getItem('ryme_settings');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return mergeSettings(defaultSettings, parsed);
  } catch (error) {
    console.warn('Failed to read saved settings:', error);
    return null;
  }
};

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => safeLoadLocal() || defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const incoming = snapshot.data();
          const merged = mergeSettings(defaultSettings, incoming);
          setSettings(merged);
          localStorage.setItem('ryme_settings', JSON.stringify(merged));
        } else {
          localStorage.setItem('ryme_settings', JSON.stringify(defaultSettings));
        }
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', Boolean(settings.display.darkMode));
    document.body.classList.toggle('compact-view', Boolean(settings.display.compactView));
  }, [settings.display.darkMode, settings.display.compactView]);

  const saveSettings = async (nextSettings = settings) => {
    try {
      setSaving(true);
      setError('');
      const merged = mergeSettings(defaultSettings, nextSettings);
      await setDoc(settingsRef, { ...merged, updatedAt: serverTimestamp() }, { merge: true });
      localStorage.setItem('ryme_settings', JSON.stringify(merged));
      setSettings(merged);
      return true;
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (partial) => {
    setSettings((prev) => mergeSettings(prev, partial));
  };

  const currencyMeta = CURRENCY_META[settings.display.currency] || CURRENCY_META.NGN;

  const formatCurrency = (value, options = {}) => {
    const amount = Number(value || 0);
    const {
      minimumFractionDigits = 2,
      maximumFractionDigits = 2,
      showSign = false
    } = options;

    const formatter = new Intl.NumberFormat(currencyMeta.locale, {
      style: 'currency',
      currency: settings.display.currency || 'NGN',
      minimumFractionDigits,
      maximumFractionDigits
    });

    const formattedAbs = formatter.format(Math.abs(amount));

    if (showSign) {
      return `${amount >= 0 ? '+' : '-'}${formattedAbs}`;
    }

    if (amount < 0) {
      return `-${formattedAbs}`;
    }

    return formattedAbs;
  };

  const value = useMemo(() => ({
    settings,
    loading,
    saving,
    error,
    updateSettings,
    saveSettings,
    formatCurrency,
    currencySymbol: currencyMeta.symbol
  }), [settings, loading, saving, error, currencyMeta.symbol]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export { defaultSettings };
