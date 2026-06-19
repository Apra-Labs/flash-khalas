import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

describe('FleetStatus', () => {
  it('shows idle when no status', () => {
    render(<FleetStatus status={null} />);
    expect(screen.getByText(/Idle/)).toBeInTheDocument();
  });

  it('shows active step', () => {
    render(
      <FleetStatus
        status={{
          message: 'Working on: add scoring',
          currentStep: 'plan',
          completedSteps: [],
        }}
      />
    );
    expect(screen.getByText(/Planning/)).toBeInTheDocument();
  });

  it('shows completed steps', () => {
    render(
      <FleetStatus
        status={{
          message: 'Reviewing...',
          currentStep: 'review-code',
          completedSteps: ['plan', 'review-plan', 'implement'],
        }}
      />
    );
    expect(screen.getByText(/Review Code/)).toBeInTheDocument();
  });
});
