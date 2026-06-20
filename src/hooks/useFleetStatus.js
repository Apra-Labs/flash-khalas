import { useState, useEffect, useRef, useCallback } from 'react';

export function parseStatusline(line) {
  if (!line) return [];
  const members = [];
  const entries = line.split(/\s{2,}/);
  for (const entry of entries) {
    const m = entry.match(/^(.+?)\s+([\w-]+):(⚡|💤|❌)\s+(busy|idle|error)(?:\(([^)]*)\))?/u);
    if (!m) continue;
    if (!m[2].includes('flash-khallas')) continue;
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

const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30000;

export default function useFleetStatus() {
  const [members, setMembers] = useState([]);
  const [featureComplete, setFeatureComplete] = useState(false);
  const eventSourceRef = useRef(null);
  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const retryTimerRef = useRef(null);

  const handleData = useCallback((data) => {
    if (typeof data === 'string') {
      if (data === 'connected') return;
      try { data = JSON.parse(data); } catch { return; }
    }
    if (data.statusline) setMembers(parseStatusline(data.statusline));
  }, []);

  useEffect(() => {
    let cancelled = false;

    function connectSSE() {
      if (cancelled) return;
      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onmessage = (e) => handleData(e.data);
      es.addEventListener('feature-complete', () => {
        setFeatureComplete(true);
        setTimeout(() => setFeatureComplete(false), 3000);
      });

      es.onopen = () => {
        retryDelayRef.current = INITIAL_RETRY_MS;
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (cancelled) return;
        retryTimerRef.current = setTimeout(() => {
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_MS);
          connectSSE();
        }, retryDelayRef.current);
      };
    }

    connectSSE();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [handleData]);

  return { members, featureComplete };
}
