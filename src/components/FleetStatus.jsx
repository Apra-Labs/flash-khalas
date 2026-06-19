export default function FleetStatus({ members, pipelineState }) {
  const steps = [
    { key: 'plan', label: 'Planning' },
    { key: 'review-plan', label: 'Review Plan' },
    { key: 'implement', label: 'Implementing' },
    { key: 'review-code', label: 'Review Code' },
    { key: 'commit', label: 'Commit & Push' },
    { key: 'ci', label: 'CI / Tests' },
    { key: 'pr', label: 'PR Raised' },
  ];

  const currentStep = pipelineState?.currentStep || null;
  const completedSteps = pipelineState?.completedSteps || [];
  const hasActivity = members.length > 0 || currentStep;

  return (
    <div className="fleet-status">
      <h3>Fleet Status</h3>

      {!hasActivity && <p className="status-idle">Idle - type a command to start</p>}

      {members.length > 0 && (
        <div className="fleet-members">
          {members.map((m) => (
            <div key={m.name} className={`member-badge ${m.status}`}>
              <span className="member-icon">{m.statusIcon}</span>
              <span className="member-name">{m.name}</span>
              <span className="member-status">
                {m.status}
                {m.elapsed && ` (${m.elapsed})`}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasActivity && (
        <div className="steps">
          {steps.map((step) => {
            const state = completedSteps.includes(step.key)
              ? 'done'
              : currentStep === step.key
                ? 'active'
                : '';
            return (
              <div key={step.key} className={`step ${state}`}>
                {state === 'done' ? '[x]' : state === 'active' ? '[>]' : '[ ]'} {step.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
