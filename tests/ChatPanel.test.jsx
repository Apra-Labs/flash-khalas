import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatPanel from '../src/components/ChatPanel';

describe('ChatPanel', () => {
  it('renders welcome message', () => {
    render(<ChatPanel onFleetUpdate={() => {}} />);
    expect(screen.getByText(/Yalla/)).toBeInTheDocument();
  });

  it('sends a message on Enter', () => {
    const onFleetUpdate = vi.fn();
    render(<ChatPanel onFleetUpdate={onFleetUpdate} />);

    const input = screen.getByPlaceholderText(/power-up/);
    fireEvent.change(input, { target: { value: 'add scoring' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getAllByText(/add scoring/).length).toBeGreaterThanOrEqual(1);
    expect(onFleetUpdate).toHaveBeenCalled();
  });

  it('clears input after send', () => {
    render(<ChatPanel onFleetUpdate={() => {}} />);

    const input = screen.getByPlaceholderText(/power-up/);
    fireEvent.change(input, { target: { value: 'fix bug' } });
    fireEvent.click(screen.getByText('SEND'));

    expect(input.value).toBe('');
  });
});
