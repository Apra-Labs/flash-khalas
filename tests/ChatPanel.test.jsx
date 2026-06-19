import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatPanel from '../src/components/ChatPanel';

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders welcome message', () => {
    render(<ChatPanel />);
    expect(screen.getByText(/Yalla/)).toBeInTheDocument();
  });

  it('sends a message on Enter and calls dispatch API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, message: 'Dispatched: "add scoring"' }),
    }));

    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/power-up/);
    fireEvent.change(input, { target: { value: 'add scoring' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByText('add scoring')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/dispatch', expect.objectContaining({
        method: 'POST',
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Dispatched: "add scoring"')).toBeInTheDocument();
    });
  });

  it('clears input after send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, message: 'Done' }),
    }));

    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/power-up/);
    fireEvent.change(input, { target: { value: 'fix bug' } });
    fireEvent.click(screen.getByText('SEND'));

    expect(input.value).toBe('');
  });

  it('shows error on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    render(<ChatPanel />);

    const input = screen.getByPlaceholderText(/power-up/);
    fireEvent.change(input, { target: { value: 'crash test' } });
    fireEvent.click(screen.getByText('SEND'));

    await waitFor(() => {
      expect(screen.getByText('Failed to reach fleet server.')).toBeInTheDocument();
    });
  });
});
