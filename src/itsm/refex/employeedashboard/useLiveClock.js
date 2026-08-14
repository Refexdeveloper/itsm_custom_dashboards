import { useEffect, useState } from 'react';
import { formatDisplayDateTime } from '../../../lib/kfITServiceDashboard.js';

export function useLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return formatDisplayDateTime(now);
}
