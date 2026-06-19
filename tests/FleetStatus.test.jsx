import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

describe('FleetStatus', () => {
  it('shows idle when no members and no state', () => {
    render(<FleetStatus members={[]} pipelineState={null} />);
    expect(screen.getByText(/Idle/)).toBeInTheDocument();
  });

  it('shows member badges', () => {
    const members = [
      { icon: '🔵', id: 2, name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '02:14' },
      { icon: '🟢', id: 2, name: 'flash-khalas-reviewer', statusIcon: '💤', status: 'idle', elapsed: null },
    ];
    render(<FleetStatus members={members} pipelineState={null} />);
    expect(screen.getByText('flash-khalas-doer')).toBeInTheDocument();
    expect(screen.getByText('flash-khalas-reviewer')).toBeInTheDocument();
    expect(screen.getByText(/02:14/)).toBeInTheDocument();
  });

  it('shows active step from pipeline state', () => {
    render(
      <FleetStatus
        members={[]}
        pipelineState={{
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
        members={[]}
        pipelineState={{
          currentStep: 'review-code',
          completedSteps: ['plan', 'review-plan', 'implement'],
        }}
      />
    );
    expect(screen.getByText(/Review Code/)).toBeInTheDocument();
  });
});
