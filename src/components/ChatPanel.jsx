import { useState, useRef, useEffect } from 'react';

const MAX_MESSAGES = 50;

function appendMessage(prev, msg) {
  return [...prev.slice(-(MAX_MESSAGES - 1)), msg];
}

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Yalla! Type a feature request or bug fix to trigger the fleet.' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;

    const prompt = input;
    setMessages((prev) => appendMessage(prev, { role: 'user', text: prompt }));
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setMessages((prev) =>
        appendMessage(prev, { role: 'system', text: data.ok ? data.message : `Error: ${data.error}` })
      );
    } catch (e) {
      setMessages((prev) =>
        appendMessage(prev, { role: 'system', text: e.message || 'Failed to reach fleet server.' })
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend();
  }

  return (
    <div className="chat-panel">
      <h3>Fleet Chat</h3>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={`${i}-${msg.role}`} className={`chat-message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a power-up system..."
          disabled={sending}
        />
        <button onClick={handleSend} disabled={sending}>
          {sending ? '...' : 'SEND'}
        </button>
      </div>
    </div>
  );
}
