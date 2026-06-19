const STATUS_PRIORITY = { busy: 0, idle: 1, error: 2 };

function parseElapsed(elapsed) {
  if (!elapsed) return Infinity;
  const [m, s] = elapsed.split(':').map(Number);
  return m * 60 + (s || 0);
}

export default function FleetStatus({ members }) {
  const sorted = [...members].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 3;
    const pb = STATUS_PRIORITY[b.status] ?? 3;
    if (pa !== pb) return pa - pb;
    return parseElapsed(a.elapsed) - parseElapsed(b.elapsed);
  });

  return (
    <div className="fleet-status">
      <h3>APRA FLEET</h3>
      <div className="fleet-members">
        {members.length === 0 ? (
          <div className="status-idle">No fleet members detected</div>
        ) : (
          sorted.map((m) => (
            <div key={m.name} className={`member-card ${m.status}`}>
              <span className="member-card-status-icon">{m.statusIcon}</span>
              <span className="member-card-name">{m.name}</span>
              <span className="member-card-badge">
                {m.status}
                {m.elapsed ? ` · ${m.elapsed}` : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
