import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

vi.mock('../src/hooks/useFleetStatus', () => ({
  default: () => ({ members: [], state: null, featureComplete: false }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal('EventSource', class {
      onmessage = null;
      onerror = null;
      close() {}
      addEventListener() {}
    });
  });

  it('renders the header', () => {
    render(<App />);
    expect(screen.getByText('Flash Khalas')).toBeInTheDocument();
  });

  it('renders the fleet status panel', () => {
    render(<App />);
    expect(screen.getByText('Fleet Status')).toBeInTheDocument();
  });

  it('renders the chat panel', () => {
    render(<App />);
    expect(screen.getByText('Fleet Chat')).toBeInTheDocument();
  });

  it('renders the game iframe', () => {
    render(<App />);
    const iframe = document.querySelector('iframe[title="Flash Khalas Game"]');
    expect(iframe).toBeInTheDocument();
    expect(iframe.src).toContain('/game/index.html');
  });
});
