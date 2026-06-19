import { useState, useEffect } from 'react';

function parseElapsed(elapsed) {
  if (!elapsed) return Infinity;
  const [m, s] = elapsed.split(':').map(Number);
  return m * 60 + (s || 0);
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function useMemberTasks(hasBusy) {
  const [taskMap, setTaskMap] = useState({});

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/pipeline');
        if (!res.ok || !active) return;
        const tasks = await res.json();
        const map = {};
        for (const t of tasks) {
          if (!map[t.member] || t.startedAt > map[t.member].startedAt) {
            map[t.member] = t;
          }
        }
        if (active) setTaskMap(map);
      } catch { /* ignore */ }
    }

    load();
    const iv = hasBusy ? setInterval(load, 3000) : null;
    return () => { active = false; if (iv) clearInterval(iv); };
  }, [hasBusy]);

  return taskMap;
}

function MemberCard({ member, task }) {
  const [expanded, setExpanded] = useState(false);
  const prompt = task?.fullPrompt || task?.prompt;

  function toggle() { setExpanded((e) => !e); }

  return (
    <div
      className={`member-card ${member.status}${expanded ? ' expanded' : ''}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(); }}
    >
      <div className="member-card-header">
        <span className="member-card-status-icon">{member.statusIcon}</span>
        {member.status === 'busy' && <span className="member-card-busy-dot" aria-hidden="true" />}
        <span className="member-card-name">{member.name}</span>
        <span className="member-card-badge">
          {member.status}{member.elapsed ? ` · ${member.elapsed}` : ''}
        </span>
        <span className="task-expand">{expanded ? '▾' : '▸'}</span>
      </div>
      <div className="member-card-detail">
        <div className="member-card-detail-inner">
          {(task?.model || task?.startedAt) && (
            <div className="member-card-meta">
              {task.model && <span className="member-card-meta-item model">{task.model}</span>}
              {task.startedAt && <span className="member-card-meta-item time">{formatTime(task.startedAt)}</span>}
            </div>
          )}
          <div className="member-card-prompt-label">PROMPT</div>
          <pre className="member-card-prompt">
            {prompt || 'No active prompt'}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function FleetStatus({ members }) {
  const hasBusy = members.some((m) => m.status === 'busy');
  const taskMap = useMemberTasks(hasBusy);

  const sorted = [...members].sort(
    (a, b) => parseElapsed(a.elapsed) - parseElapsed(b.elapsed)
  );

  return (
    <div className="fleet-status">
      <h3>APRA FLEET</h3>
      <div className="fleet-members">
        {members.length === 0 ? (
          <div className="status-idle">No fleet members detected</div>
        ) : (
          sorted.map((m) => (
            <MemberCard key={m.name} member={m} task={taskMap[m.name]} />
          ))
        )}
      </div>
    </div>
  );
}
