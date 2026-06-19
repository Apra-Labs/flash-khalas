import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FleetStatus from '../src/components/FleetStatus';

vi.mock('../src/hooks/useFleetLogs', () => ({
  default: () => ({ logs: [], getLogsForStep: () => [] }),
}));

describe('FleetStatus', () => {
  it('shows idle when no members and no state', () => {
    render(<FleetStatus members={[]} pipelineState={null} />);
    expect(screen.getByText(/Idle/)).toBeInTheDocument();
  });

  it('shows member cards', () => {
    const members = [
      { icon: '🔵2', name: 'flash-khalas-doer', statusIcon: '⚡', status: 'busy', elapsed: '02:14' },
      { icon: '🟢2', name: 'flash-khalas-reviewer', statusIcon: '💤', status: 'idle', elapsed: null },
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

  it('renders step cards with correct icons', () => {
    render(
      <FleetStatus
        members={[]}
        pipelineState={{
          currentStep: 'implement',
          completedSteps: ['plan', 'review-plan'],
        }}
      />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[0].textContent).toContain('✓');
    expect(buttons[2].textContent).toContain('▶');
    expect(buttons[3].textContent).toContain('○');
  });
});
