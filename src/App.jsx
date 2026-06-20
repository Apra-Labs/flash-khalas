import { useState } from 'react';
import GameFrame from './components/GameFrame';
import FleetStatus from './components/FleetStatus';
import BrandingInfo from './components/BrandingInfo';
import AboutOverlay from './components/AboutOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import useFleetStatus from './hooks/useFleetStatus';

export default function App() {
  const { members, featureComplete } = useFleetStatus();
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Flash Khallas</h1>
        <span className="subtitle">powered by apra-fleet</span>
      </header>
      <main className="app-main">
        <div className="game-section">
          <GameFrame featureComplete={featureComplete} />
        </div>
        <aside className="sidebar">
          <ErrorBoundary>
            <FleetStatus members={members} />
          </ErrorBoundary>
          <BrandingInfo />
          <button className="about-trigger" onClick={() => setShowAbout(true)}>About</button>
        </aside>
      </main>
      {showAbout && <AboutOverlay onClose={() => setShowAbout(false)} />}
    </div>
  );
}
