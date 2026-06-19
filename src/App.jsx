import { useState } from 'react';
import ChatPanel from './components/ChatPanel';
import GameFrame from './components/GameFrame';
import FleetStatus from './components/FleetStatus';

export default function App() {
  const [fleetStatus, setFleetStatus] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Flash Khalas</h1>
        <span className="subtitle">powered by apra-fleet</span>
      </header>
      <main className="app-main">
        <div className="game-section">
          <GameFrame />
        </div>
        <aside className="sidebar">
          <FleetStatus status={fleetStatus} />
          <ChatPanel onFleetUpdate={setFleetStatus} />
        </aside>
      </main>
    </div>
  );
}
