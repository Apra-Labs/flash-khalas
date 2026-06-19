import { useState } from 'react';
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

export default function FleetStatus({ members }) {
  const hasBusy = members.some((m) => m.status === 'busy');
  const { tasks } = useFleetPipeline(hasBusy);
  const [expandedIdx, setExpandedIdx] = useState(null);

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
            {promptTasks.map((task, idx) => {
              const taskKey = `${task.startedAt}-${task.member}`;
              const isExpanded = expandedIdx === taskKey;
              const icon = PHASE_ICONS[task.status] || '○';
              const label = PHASE_LABELS[task.phase] || task.phase;

              return (
                <div key={taskKey} className="task-wrapper">
                  <button
                    className={`task-card ${task.status}`}
                    onClick={() => setExpandedIdx(isExpanded ? null : taskKey)}
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
                    <span className="task-expand">{isExpanded ? '▾' : '▸'}</span>
                  </button>

                  {isExpanded && (
                    <div className="task-detail">
                      <div className="detail-grid">
                        <div className="detail-row">
                          <span className="detail-key">Member</span>
                          <span className="detail-val">{task.member}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-key">Model</span>
                          <span className="detail-val model-badge">{task.model}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-key">Duration</span>
                          <span className="detail-val">{formatDuration(task.elapsedMs)}</span>
                        </div>
                        {(task.tokensIn != null || task.tokensOut != null) && (
                          <div className="detail-row">
                            <span className="detail-key">Tokens</span>
                            <span className="detail-val">
                              {task.tokensIn?.toLocaleString() || '—'} in / {task.tokensOut?.toLocaleString() || '—'} out
                            </span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-key">Started</span>
                          <span className="detail-val">{formatTime(task.startedAt)}</span>
                        </div>
                        {task.endedAt && (
                          <div className="detail-row">
                            <span className="detail-key">Ended</span>
                            <span className="detail-val">{formatTime(task.endedAt)}</span>
                          </div>
                        )}
                        <div className="detail-row">
                          <span className="detail-key">Status</span>
                          <span className={`detail-val status-${task.status}`}>{task.status}</span>
                        </div>
                      </div>
                      <div className="detail-prompt">
                        <span className="detail-key">Prompt</span>
                        <pre className="prompt-text">{task.prompt}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {promptTasks.length === 0 && members.length > 0 && (
        <div className="status-idle">Idle — dispatch a task to start the pipeline</div>
      )}
    </div>
  );
}
