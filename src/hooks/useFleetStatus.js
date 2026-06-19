import { useState, useEffect, useRef, useCallback } from 'react';

export function parseStatusline(line) {
  if (!line) return [];
  const members = [];
  const entries = line.split(/\s{2,}/);
  for (const entry of entries) {
    const m = entry.match(/^(.+?)\s+([\w-]+):(⚡|💤|❌)\s+(busy|idle|error)(?:\(([^)]*)\))?/u);
    if (!m) continue;
    if (!m[2].includes('flash-khalas')) continue;
    members.push({
      icon: m[1],
      name: m[2],
      statusIcon: m[3],
      status: m[4],
      elapsed: m[5] || null,
    });
  }
  return members;
}

export default function useFleetStatus() {
  const [members, setMembers] = useState([]);
  const [state, setState] = useState(null);
  const [featureComplete, setFeatureComplete] = useState(false);
  const eventSourceRef = useRef(null);
  const pollingRef = useRef(null);

  const handleData = useCallback((data) => {
    if (typeof data === 'string') {
      if (data === 'connected') return;
      try { data = JSON.parse(data); } catch (e) { console.warn('Failed to parse SSE data:', e.message); return; }
    }
    if (data.statusline) setMembers(parseStatusline(data.statusline));
    if (data.state) setState(data.state);
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connectSSE() {
      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onmessage = (e) => handleData(e.data);
      es.addEventListener('feature-complete', () => {
        setFeatureComplete(true);
        setTimeout(() => setFeatureComplete(false), 3000);
      });

      es.onerror = () => {
        es.close();
        if (!cancelled) startPolling();
      };
    }

    function startPolling() {
      if (pollingRef.current) return;
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/status');
          if (res.ok) {
            const data = await res.json();
            handleData(data);
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            connectSSE();
          }
        } catch (e) { console.warn('Fleet status poll failed:', e.message); }
      }, 2000);
    }

    connectSSE();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [handleData]);

  return { members, state, featureComplete };
}
