import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const STORAGE_KEY = 'ryme_page_states';
const SCROLL_DEBOUNCE_MS = 100;

/**
 * Get all page states from localStorage
 */
const getStoredStates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('Failed to load page states:', e);
    return {};
  }
};

/**
 * Save all page states to localStorage
 */
const saveStoredStates = (states) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
  } catch (e) {
    console.warn('Failed to save page states:', e);
  }
};

/**
 * Hook to persist and restore page state including scroll position
 * @param {string} pageKey - Unique identifier for the page (e.g., 'inventory', 'orders')
 * @param {object} defaultState - Default state values
 * @param {object} options - Configuration options
 * @returns {object} - { state, setState, updateState, clearState, scrollRef }
 */
export const usePageState = (pageKey, defaultState = {}, options = {}) => {
  const location = useLocation();
  const { 
    persistScroll = true,
    persistOnUnmount = true,
    scrollContainerSelector = null, // CSS selector for scroll container, null = window
  } = options;

  // Use location-based key if no pageKey provided
  const effectiveKey = pageKey || location.pathname;
  
  // Ref for scroll container
  const scrollRef = useRef(null);
  const isRestoringScroll = useRef(false);
  const lastScrollPosition = useRef(0);

  // Initialize state from storage or defaults
  const [state, setStateInternal] = useState(() => {
    const allStates = getStoredStates();
    const pageState = allStates[effectiveKey];
    if (pageState?.state) {
      return { ...defaultState, ...pageState.state };
    }
    return defaultState;
  });

  // Get stored scroll position
  const getStoredScrollPosition = useCallback(() => {
    const allStates = getStoredStates();
    return allStates[effectiveKey]?.scrollPosition || 0;
  }, [effectiveKey]);

  // Save current state to storage
  const saveState = useCallback((newState, scrollPos = null) => {
    const allStates = getStoredStates();
    allStates[effectiveKey] = {
      state: newState,
      scrollPosition: scrollPos ?? allStates[effectiveKey]?.scrollPosition ?? 0,
      timestamp: Date.now(),
    };
    saveStoredStates(allStates);
  }, [effectiveKey]);

  // Update state and persist
  const setState = useCallback((newState) => {
    setStateInternal(prev => {
      const updated = typeof newState === 'function' ? newState(prev) : newState;
      saveState(updated);
      return updated;
    });
  }, [saveState]);

  // Partial state update
  const updateState = useCallback((updates) => {
    setStateInternal(prev => {
      const updated = { ...prev, ...updates };
      saveState(updated);
      return updated;
    });
  }, [saveState]);

  // Clear state for this page
  const clearState = useCallback(() => {
    const allStates = getStoredStates();
    delete allStates[effectiveKey];
    saveStoredStates(allStates);
    setStateInternal(defaultState);
  }, [effectiveKey, defaultState]);

  // Get scroll container element
  const getScrollContainer = useCallback(() => {
    if (scrollContainerSelector) {
      return document.querySelector(scrollContainerSelector);
    }
    if (scrollRef.current) {
      return scrollRef.current;
    }
    return window;
  }, [scrollContainerSelector]);

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (!persistScroll || isRestoringScroll.current) return;
    
    const container = getScrollContainer();
    let scrollPos = 0;
    
    if (container === window) {
      scrollPos = window.scrollY || document.documentElement.scrollTop;
    } else if (container) {
      scrollPos = container.scrollTop;
    }
    
    if (scrollPos !== lastScrollPosition.current) {
      lastScrollPosition.current = scrollPos;
      const allStates = getStoredStates();
      if (allStates[effectiveKey]) {
        allStates[effectiveKey].scrollPosition = scrollPos;
      } else {
        allStates[effectiveKey] = { state, scrollPosition: scrollPos, timestamp: Date.now() };
      }
      saveStoredStates(allStates);
    }
  }, [persistScroll, getScrollContainer, effectiveKey, state]);

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!persistScroll) return;
    
    const scrollPos = getStoredScrollPosition();
    if (scrollPos > 0) {
      isRestoringScroll.current = true;
      
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        const container = getScrollContainer();
        
        if (container === window) {
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
        } else if (container) {
          container.scrollTop = scrollPos;
        }
        
        // Allow scroll saving after a short delay
        setTimeout(() => {
          isRestoringScroll.current = false;
        }, 100);
      });
    }
  }, [persistScroll, getStoredScrollPosition, getScrollContainer]);

  // Set up scroll listener
  useEffect(() => {
    if (!persistScroll) return;

    let debounceTimer;
    const handleScroll = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(saveScrollPosition, SCROLL_DEBOUNCE_MS);
    };

    const container = getScrollContainer();
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      clearTimeout(debounceTimer);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [persistScroll, getScrollContainer, saveScrollPosition]);

  // Restore scroll on mount
  useEffect(() => {
    // Delay to ensure content is rendered
    const timer = setTimeout(restoreScrollPosition, 50);
    return () => clearTimeout(timer);
  }, [restoreScrollPosition]);

  // Save state on unmount
  useEffect(() => {
    if (!persistOnUnmount) return;
    
    return () => {
      saveState(state, lastScrollPosition.current);
    };
  }, [persistOnUnmount, saveState, state]);

  return {
    state,
    setState,
    updateState,
    clearState,
    scrollRef,
    restoreScrollPosition,
    saveScrollPosition,
  };
};

/**
 * Hook specifically for filter state persistence
 * @param {string} pageKey - Unique identifier for the page
 * @param {object} defaultFilters - Default filter values
 */
export const useFilterState = (pageKey, defaultFilters = {}) => {
  const { state, updateState, clearState } = usePageState(
    `${pageKey}_filters`,
    defaultFilters,
    { persistScroll: false }
  );

  const setFilter = useCallback((key, value) => {
    updateState({ [key]: value });
  }, [updateState]);

  const resetFilters = useCallback(() => {
    clearState();
  }, [clearState]);

  return {
    filters: state,
    setFilter,
    setFilters: updateState,
    resetFilters,
  };
};

/**
 * Hook for persisting search query
 * @param {string} pageKey - Unique identifier for the page
 * @param {string} defaultSearch - Default search value
 */
export const useSearchState = (pageKey, defaultSearch = '') => {
  const { state, updateState } = usePageState(
    `${pageKey}_search`,
    { query: defaultSearch },
    { persistScroll: false }
  );

  const setSearch = useCallback((query) => {
    updateState({ query });
  }, [updateState]);

  return {
    search: state.query,
    setSearch,
  };
};

/**
 * Clear all stored page states
 */
export const clearAllPageStates = () => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Get stored state for a specific page (useful for debugging)
 */
export const getPageState = (pageKey) => {
  const allStates = getStoredStates();
  return allStates[pageKey] || null;
};

export default usePageState;
