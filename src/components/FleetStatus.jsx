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

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
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

function MemberModal({ member, task, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const prompt = task?.fullPrompt || task?.prompt;

  return (
    <div className="fleet-modal-backdrop" onClick={onClose}>
      <div className="fleet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fleet-modal-header">
          <div className="fleet-modal-title">
            <span style={{ fontSize: 18 }}>{member.statusIcon}</span>
            {member.status === 'busy' && <span className="member-card-busy-dot" aria-hidden="true" />}
            <span className="fleet-modal-name">{member.name}</span>
          </div>
          <button className="fleet-modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="fleet-modal-meta">
          <div className="fleet-meta-item">
            <span className="fleet-meta-key">Status</span>
            <span className={`fleet-meta-val status-${member.status}`}>{member.status}</span>
          </div>
          <div className="fleet-meta-item">
            <span className="fleet-meta-key">Elapsed</span>
            <span className="fleet-meta-val">{member.elapsed || '—'}</span>
          </div>
          {task?.model && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Model</span>
              <span className="fleet-meta-val model">{task.model}</span>
            </div>
          )}
          {task?.elapsedMs != null && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Duration</span>
              <span className="fleet-meta-val">{formatDuration(task.elapsedMs)}</span>
            </div>
          )}
          {(task?.tokensIn != null || task?.tokensOut != null) && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Tokens in</span>
              <span className="fleet-meta-val">{task.tokensIn?.toLocaleString() || '—'}</span>
            </div>
          )}
          {task?.tokensOut != null && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Tokens out</span>
              <span className="fleet-meta-val">{task.tokensOut?.toLocaleString() || '—'}</span>
            </div>
          )}
          {task?.startedAt && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Started</span>
              <span className="fleet-meta-val">{formatTime(task.startedAt)}</span>
            </div>
          )}
          {task?.status && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Task status</span>
              <span className={`fleet-meta-val status-${task.status}`}>{task.status}</span>
            </div>
          )}
        </div>

        {prompt ? (
          <div className="fleet-modal-section">
            <h4>Prompt</h4>
            <pre className="fleet-modal-code">{prompt}</pre>
          </div>
        ) : null}

        {task?.response ? (
          <div className="fleet-modal-section">
            <h4>Output</h4>
            <pre className="fleet-modal-code response">{task.response}</pre>
          </div>
        ) : null}

        {!prompt && !task?.response && (
          <div className="fleet-modal-section">
            <p className="fleet-modal-empty">No task data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MemberCard({ member, onSelect }) {
  return (
    <div
      className={`member-card ${member.status}`}
      onClick={() => onSelect(member)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(member); }}
    >
      <div className="member-card-header">
        <span className="member-card-status-icon">{member.statusIcon}</span>
        {member.status === 'busy' && <span className="member-card-busy-dot" aria-hidden="true" />}
        <span className="member-card-name">{member.name}</span>
        <span className="member-card-badge">
          {member.status}{member.elapsed ? ` · ${member.elapsed}` : ''}
        </span>
        <span className="task-expand">▸</span>
      </div>
    </div>
  );
}

export default function FleetStatus({ members }) {
  const hasBusy = members.some((m) => m.status === 'busy');
  const taskMap = useMemberTasks(hasBusy);
  const [selected, setSelected] = useState(null);

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
            <MemberCard key={m.name} member={m} onSelect={setSelected} />
          ))
        )}
      </div>
      {selected && (
        <MemberModal
          member={selected}
          task={taskMap[selected.name]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
