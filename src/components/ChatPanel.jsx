import { useState } from 'react';

export default function ChatPanel({ onFleetUpdate }) {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Yalla! Type a feature request or bug fix to trigger the fleet.' },
  ]);
  const [input, setInput] = useState('');

  function handleSend() {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);

    // TODO: Hook into apra-fleet execute_prompt via WebSocket/API
    const ack = {
      role: 'system',
      text: `Fleet dispatched: "${input}". Doer-reviewer loop started...`,
    };
    setMessages((prev) => [...prev, ack]);

    onFleetUpdate({
      message: `Working on: ${input}`,
      currentStep: 'plan',
      completedSteps: [],
    });

    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend();
  }

  return (
    <div className="chat-panel">
      <h3>Fleet Chat</h3>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a power-up system..."
        />
        <button onClick={handleSend}>SEND</button>
      </div>
    </div>
  );
}
