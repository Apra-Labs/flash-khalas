import { useState } from 'react';
import useFleetLogs from '../hooks/useFleetLogs';

const STEP_TAGS = {
  plan: ['execute_prompt'],
  'review-plan': ['execute_prompt'],
  implement: ['execute_prompt', 'execute_command'],
  'review-code': ['execute_prompt'],
  commit: ['execute_command'],
  ci: ['execute_command'],
  pr: ['execute_command'],
};

const STEPS = [
  { key: 'plan', label: 'Planning' },
  { key: 'review-plan', label: 'Review Plan' },
  { key: 'implement', label: 'Implementing' },
  { key: 'review-code', label: 'Review Code' },
  { key: 'commit', label: 'Commit & Push' },
  { key: 'ci', label: 'CI / Tests' },
  { key: 'pr', label: 'PR Raised' },
];

function formatTs(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

export default function FleetStatus({ members, pipelineState }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const hasBusy = members.some((m) => m.status === 'busy');
  const { logs } = useFleetLogs(hasBusy);

  const currentStep = pipelineState?.currentStep || null;
  const completedSteps = pipelineState?.completedSteps || [];
  const hasActivity = members.length > 0 || currentStep;

  function getStepState(key) {
    if (completedSteps.includes(key)) return 'done';
    if (currentStep === key) return 'active';
    return 'pending';
  }

  function getLogsForStep(key) {
    const tags = STEP_TAGS[key] || [];
    return logs.filter((l) => tags.includes(l.tag));
  }

  function toggleStep(key) {
    setExpandedStep(expandedStep === key ? null : key);
  }

  return (
    <div className="fleet-status">
      <h3>Fleet Status</h3>

      {!hasActivity && <p className="status-idle">Idle — type a command to start</p>}

      {members.length > 0 && (
        <div className="fleet-members">
          {members.map((m) => (
            <div key={m.name} className={`member-card ${m.status}`}>
              <span className="member-card-icon">{m.statusIcon}</span>
              <div className="member-card-info">
                <span className="member-card-name">{m.name}</span>
                <span className="member-card-detail">
                  {m.status}
                  {m.elapsed && ` · ${m.elapsed}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasActivity && (
        <div className="pipeline-steps">
          {STEPS.map((step) => {
            const state = getStepState(step.key);
            const isExpanded = expandedStep === step.key;
            const stepLogs = isExpanded ? getLogsForStep(step.key) : [];

            return (
              <div key={step.key} className="step-wrapper">
                <button
                  className={`step-card ${state}`}
                  onClick={() => toggleStep(step.key)}
                  type="button"
                >
                  <span className="step-icon">
                    {state === 'done' ? '✓' : state === 'active' ? '▶' : '○'}
                  </span>
                  <span className="step-label">{step.label}</span>
                  {state === 'active' && (
                    <span className="step-elapsed">running...</span>
                  )}
                  <span className="step-expand">{isExpanded ? '▾' : '▸'}</span>
                </button>

                {isExpanded && (
                  <div className="step-logs">
                    {stepLogs.length === 0 ? (
                      <div className="log-empty">No log entries yet</div>
                    ) : (
                      stepLogs.slice(-20).map((entry, i) => (
                        <div key={i} className="log-entry">
                          <span className="log-ts">{formatTs(entry.ts)}</span>
                          <span className="log-member">{entry.member}</span>
                          <span className="log-msg">{truncate(entry.message, 80)}</span>
                          {entry.tokens && (
                            <span className="log-tokens">tok:{entry.tokens}</span>
                          )}
                          {entry.elapsed && (
                            <span className="log-elapsed">{entry.elapsed}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
