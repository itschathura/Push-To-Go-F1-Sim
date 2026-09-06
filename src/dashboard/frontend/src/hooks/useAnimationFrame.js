import { useEffect, useRef } from 'react';

export function useAnimationFrame(callback) {
  const requestRef = useRef();

  const animate = (time) => {
    callback(time);
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Only setup once
}
