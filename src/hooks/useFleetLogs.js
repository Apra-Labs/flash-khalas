import { useState, useEffect, useRef, useCallback } from 'react';

export default function useFleetLogs(hasBusyMembers) {
  const [logs, setLogs] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!hasBusyMembers) return;

    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs');
        if (res.ok) setLogs(await res.json());
      } catch {
        /* ignore fetch errors */
      }
    }

    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasBusyMembers]);

  const getLogsForStep = useCallback(
    (tag) => logs.filter((l) => l.tag === tag),
    [logs],
  );

  return { logs, getLogsForStep };
}
