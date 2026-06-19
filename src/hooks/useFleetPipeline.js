import { useState, useEffect } from 'react';

export default function useFleetPipeline(hasBusyMembers) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let active = true;

    async function fetchPipeline() {
      try {
        const res = await fetch('/api/pipeline');
        if (res.ok && active) setTasks(await res.json());
      } catch {
        if (active) console.warn('Pipeline fetch failed');
      }
    }

    fetchPipeline();

    const interval = hasBusyMembers ? setInterval(fetchPipeline, 2000) : null;

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [hasBusyMembers]);

  return { tasks };
}
