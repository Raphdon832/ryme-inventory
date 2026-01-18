import { useEffect } from 'react';

export const useScrollLock = (isLocked) => {
  useEffect(() => {
    if (isLocked) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = 'var(--scrollbar-width, 0px)'; // Prevent layout shift
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isLocked]);
};

export default useScrollLock;
