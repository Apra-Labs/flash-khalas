import GameFrame from './components/GameFrame';
import FleetStatus from './components/FleetStatus';
import ErrorBoundary from './components/ErrorBoundary';
import useFleetStatus from './hooks/useFleetStatus';

export default function App() {
  const { members, featureComplete } = useFleetStatus();

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Flash Khalas</h1>
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
        </aside>
      </main>
    </div>
  );
}
