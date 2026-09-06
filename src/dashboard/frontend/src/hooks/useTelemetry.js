import { useState, useEffect, useRef } from 'react';

export function useTelemetry(intervalMs = 100) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const fetchTelemetry = async () => {
      try {
        const response = await fetch('/api/telemetry');
        const json = await response.json();
        if (isMounted) {
          if (json.error) {
            setError(json.error);
          } else {
            setData(json);
            setError(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          timeoutId = setTimeout(fetchTelemetry, intervalMs);
        }
      }
    };

    fetchTelemetry();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [intervalMs]);

  return { data, error };
}
