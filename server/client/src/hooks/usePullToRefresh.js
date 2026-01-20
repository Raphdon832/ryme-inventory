import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Check if any modal is currently open in the DOM
 */
const isModalOpen = () => {
  return !!document.querySelector('.modal-overlay, .stat-modal-overlay, [class*="modal"][class*="overlay"]');
};

/**
 * Custom hook for pull-to-refresh functionality on iOS/mobile devices
 * @param {Function} onRefresh - Async function to call when refresh is triggered
 * @param {Object} options - Configuration options
 * @returns {Object} - Pull-to-refresh state and ref
 */
const usePullToRefresh = (onRefresh, options = {}) => {
  const {
    threshold = 80,           // Distance to pull before triggering refresh
    maxPull = 120,            // Maximum pull distance
    resistance = 2.5,         // Pull resistance factor
    disabled = false,         // Disable pull-to-refresh
  } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    // Only enable pull-to-refresh when scrolled to top, not disabled, and no modal is open
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5 || isRefreshing || disabled || isModalOpen()) return;
    
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [isRefreshing, disabled]);

  const handleTouchMove = useCallback((e) => {
    if (!isPullingRef.current || isRefreshing || disabled || isModalOpen()) return;
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop > 5) {
      isPullingRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0) {
      // Apply resistance to make it feel natural
      const distance = Math.min(diff / resistance, maxPull);
      setPullDistance(distance);
      setIsPulling(true);
      
      // Prevent default scroll when pulling down (only if cancelable)
      if (distance > 10 && e.cancelable) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, resistance, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    
    isPullingRef.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6); // Keep spinner visible during refresh
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh error:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current || document;
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldRefresh = pullDistance >= threshold;

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh,
  };
};

export default usePullToRefresh;
