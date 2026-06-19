export default function FleetStatus({ status }) {
  if (!status) {
    return (
      <div className="fleet-status">
        <h3>Fleet Status</h3>
        <p className="status-idle">Idle - type a command to start</p>
      </div>
    );
  }

  const steps = [
    { key: 'plan', label: 'Planning' },
    { key: 'review-plan', label: 'Review Plan' },
    { key: 'implement', label: 'Implementing' },
    { key: 'review-code', label: 'Review Code' },
    { key: 'commit', label: 'Commit & Push' },
    { key: 'ci', label: 'CI / Tests' },
    { key: 'pr', label: 'PR Raised' },
  ];

  return (
    <div className="fleet-status">
      <h3>Fleet Status</h3>
      <p className="status-active">{status.message || 'Running...'}</p>
      <div className="steps">
        {steps.map((step) => {
          const state = status.completedSteps?.includes(step.key)
            ? 'done'
            : status.currentStep === step.key
              ? 'active'
              : '';
          return (
            <div key={step.key} className={`step ${state}`}>
              {state === 'done' ? '[x]' : state === 'active' ? '[>]' : '[ ]'} {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
