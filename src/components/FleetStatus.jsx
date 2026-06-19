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

function memberShort(name) {
  return (name || '').replace('flash-khalas-', '');
}

const STATUS_ICONS = { done: '✓', running: '▶', error: '✗', timeout: '⏱', interrupted: '—' };

function useAllTasks(hasBusy) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch('/api/pipeline');
        if (!res.ok || !active) return;
        const data = await res.json();
        // Sort newest first — no deduplication, keep full history
        data.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
        if (active) setTasks(data);
      } catch { /* ignore */ }
    }

    load();
    const iv = hasBusy ? setInterval(load, 3000) : null;
    return () => { active = false; if (iv) clearInterval(iv); };
  }, [hasBusy]);

  return tasks;
}

function RunModal({ task, member, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const prompt = task?.fullPrompt || task?.prompt;
  const isRunning = task?.status === 'running';

  return (
    <div className="fleet-modal-backdrop" onClick={onClose}>
      <div className="fleet-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="fleet-modal-header">
          <div className="fleet-modal-title">
            {member && <span style={{ fontSize: 18 }}>{member.statusIcon}</span>}
            {member?.status === 'busy' && <span className="member-card-busy-dot" aria-hidden="true" />}
            <span className="fleet-modal-name">{task?.member || member?.name}</span>
          </div>
          <button className="fleet-modal-close" onClick={onClose} type="button" autoFocus>✕</button>
        </div>

        <div className="fleet-modal-meta">
          <div className="fleet-meta-item">
            <span className="fleet-meta-key">Status</span>
            <span className={`fleet-meta-val status-${task?.status || member?.status}`}>
              {task?.status || member?.status || '—'}
            </span>
          </div>
          {isRunning && member?.elapsed && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Elapsed</span>
              <span className="fleet-meta-val">{member.elapsed}</span>
            </div>
          )}
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
          {task?.tokensIn != null && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Tokens in</span>
              <span className="fleet-meta-val">{task.tokensIn.toLocaleString()}</span>
            </div>
          )}
          {task?.tokensOut != null && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Tokens out</span>
              <span className="fleet-meta-val">{task.tokensOut.toLocaleString()}</span>
            </div>
          )}
          {task?.startedAt && (
            <div className="fleet-meta-item">
              <span className="fleet-meta-key">Started</span>
              <span className="fleet-meta-val">{formatTime(task.startedAt)}</span>
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

function MemberCard({ member, mostRecentTask, onSelect }) {
  return (
    <div
      className={`member-card ${member.status}`}
      onClick={() => onSelect(mostRecentTask || null, member)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(mostRecentTask || null, member); }}
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

function RunHistoryRow({ task, onSelect }) {
  const icon = STATUS_ICONS[task.status] || '○';
  const prompt = task.fullPrompt || task.prompt || '';

  return (
    <button
      className={`run-row run-row-${task.status}`}
      onClick={() => onSelect(task, null)}
      type="button"
    >
      <span className="run-row-icon">{icon}</span>
      <div className="run-row-body">
        <span className="run-row-member">{memberShort(task.member)}</span>
        <span className="run-row-prompt">{prompt.slice(0, 80)}</span>
      </div>
      <div className="run-row-meta">
        {task.status === 'running'
          ? <span className="run-row-live">running…</span>
          : <span className="run-row-duration">{formatDuration(task.elapsedMs)}</span>
        }
        <span className="run-row-time">{formatTime(task.startedAt)}</span>
      </div>
    </button>
  );
}

export default function FleetStatus({ members }) {
  const hasBusy = members.some((m) => m.status === 'busy');
  const allTasks = useAllTasks(hasBusy);
  const [selected, setSelected] = useState(null); // { task, member }

  const memberMap = Object.fromEntries(members.map((m) => [m.name, m]));

  // Most recent task per member for card click
  const latestByMember = {};
  for (const t of allTasks) {
    if (!latestByMember[t.member]) latestByMember[t.member] = t;
  }

  const sorted = [...members].sort(
    (a, b) => parseElapsed(a.elapsed) - parseElapsed(b.elapsed)
  );

  function openModal(task, member) {
    setSelected({ task, member });
  }

  return (
    <div className="fleet-status">
      <h3>APRA FLEET</h3>
      <div className="fleet-members">
        {members.length === 0 ? (
          <div className="status-idle">No fleet members detected</div>
        ) : (
          sorted.map((m) => (
            <MemberCard
              key={m.name}
              member={m}
              mostRecentTask={latestByMember[m.name]}
              onSelect={openModal}
            />
          ))
        )}
      </div>

      {allTasks.length > 0 && (
        <>
          <h4 className="run-history-header">RUN HISTORY</h4>
          <div className="run-history">
            {allTasks.map((t) => (
              <RunHistoryRow
                key={`${t.member}-${t.startedAt}`}
                task={t}
                onSelect={openModal}
              />
            ))}
          </div>
        </>
      )}

      {selected && (
        <RunModal
          task={selected.task}
          member={selected.member || memberMap[selected.task?.member]}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
