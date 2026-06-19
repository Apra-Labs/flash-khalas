import { useState, useEffect } from 'react';
import useFleetPipeline from '../hooks/useFleetPipeline';

const PHASE_LABELS = {
  implement: 'Implement',
  review: 'Code Review',
  fix: 'Apply Fixes',
};

const PHASE_ICONS = {
  done: '✓',
  running: '▶',
  error: '✗',
  timeout: '⏱',
  interrupted: '—',
};

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function memberShort(name) {
  if (!name) return '';
  return name.replace('flash-khalas-', '');
}

function TaskModal({ task, onClose }) {
  const label = PHASE_LABELS[task.phase] || task.phase;
  const promptText = task.fullPrompt || task.prompt;

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className={`modal-icon status-${task.status}`}>
              {PHASE_ICONS[task.status] || '○'}
            </span>
            <span className="modal-label">{label}</span>
          </div>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <div className="modal-meta">
          <div className="meta-item">
            <span className="meta-key">Member</span>
            <span className="meta-val">{task.member}</span>
          </div>
          <div className="meta-item">
            <span className="meta-key">Model</span>
            <span className="meta-val model-badge">{task.model}</span>
          </div>
          <div className="meta-item">
            <span className="meta-key">Duration</span>
            <span className="meta-val">{formatDuration(task.elapsedMs)}</span>
          </div>
          {(task.tokensIn != null || task.tokensOut != null) && (
            <div className="meta-item">
              <span className="meta-key">Tokens</span>
              <span className="meta-val">
                {task.tokensIn?.toLocaleString() || '—'} in / {task.tokensOut?.toLocaleString() || '—'} out
              </span>
            </div>
          )}
          <div className="meta-item">
            <span className="meta-key">Time</span>
            <span className="meta-val">
              {formatTime(task.startedAt)}{task.endedAt ? ` → ${formatTime(task.endedAt)}` : ''}
            </span>
          </div>
          <div className="meta-item">
            <span className="meta-key">Status</span>
            <span className={`meta-val status-${task.status}`}>{task.status}</span>
          </div>
        </div>

        <div className="modal-section">
          <h4>Prompt</h4>
          <pre className="modal-code">{promptText}</pre>
        </div>

        {task.response && (
          <div className="modal-section">
            <h4>Response</h4>
            <pre className="modal-code response">{task.response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FleetStatus({ members }) {
  const hasBusy = members.some((m) => m.status === 'busy');
  const { tasks } = useFleetPipeline(hasBusy);
  const [modalTask, setModalTask] = useState(null);

  const promptTasks = tasks.filter((t) => t.phase);

  return (
    <div className="fleet-status">
      <h3>APRA FLEET</h3>

      <div className="fleet-members">
        {members.length === 0 ? (
          <div className="status-idle">No fleet members detected</div>
        ) : (
          members.map((m) => (
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

      {promptTasks.length > 0 && (
        <>
          <h4 className="pipeline-header">PIPELINE</h4>
          <div className="pipeline-tasks">
            {promptTasks.map((task) => {
              const taskKey = `${task.startedAt}-${task.member}`;
              const icon = PHASE_ICONS[task.status] || '○';
              const label = PHASE_LABELS[task.phase] || task.phase;

              return (
                <button
                  key={taskKey}
                  className={`task-card ${task.status}`}
                  onClick={() => setModalTask(task)}
                  type="button"
                >
                  <span className="task-icon">{icon}</span>
                  <div className="task-summary">
                    <span className="task-label">{label}</span>
                    <span className="task-member">{memberShort(task.member)}</span>
                  </div>
                  <div className="task-stats">
                    {task.status === 'running' ? (
                      <span className="task-running">running...</span>
                    ) : (
                      <>
                        <span className="task-duration">{formatDuration(task.elapsedMs)}</span>
                        {task.tokensOut && (
                          <span className="task-tokens">{task.tokensOut.toLocaleString()} tok</span>
                        )}
                      </>
                    )}
                  </div>
                  <span className="task-expand">▸</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {promptTasks.length === 0 && members.length > 0 && (
        <div className="status-idle">Idle — dispatch a task to start the pipeline</div>
      )}

      {modalTask && <TaskModal task={modalTask} onClose={() => setModalTask(null)} />}
    </div>
  );
}
