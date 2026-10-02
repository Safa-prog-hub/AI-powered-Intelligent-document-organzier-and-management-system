import { useEffect, useState } from 'react';

/**
 * useDebounce — returns a value that updates only after `delay` ms of
 * quiet time (Phase 7 Smart Search: 300ms debounce per keystroke).
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
