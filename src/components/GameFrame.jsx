import { useState, useEffect } from 'react';

export default function GameFrame({ featureComplete }) {
  const [reloading, setReloading] = useState(false);
  const [cacheBust, setCacheBust] = useState('');

  useEffect(() => {
    if (!featureComplete) return;
    setReloading(true);
    setCacheBust(`?v=${Date.now()}`);
    const timer = setTimeout(() => setReloading(false), 1500);
    return () => clearTimeout(timer);
  }, [featureComplete]);

  return (
    <div className="game-frame-wrapper">
      {reloading && <div className="reload-overlay">Reloading...</div>}
      <iframe
        src={`/game/index.html${cacheBust}`}
        title="Flash Khalas Game"
        allow="autoplay"
      />
    </div>
  );
}
