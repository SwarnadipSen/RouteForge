import { useState } from "preact/hooks";

export default function ChatBox({ messages, onSend, isLoading, isDisabled }) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || isDisabled || isLoading) {
      return;
    }

    onSend(message);
    setDraft("");
  }

  return (
    <section className="chat-box" data-testid="chat-box">
      <div className="section-title-row">
        <span className="dot" />
        <span className="section-title">Ask the Supply Chain AI</span>
      </div>

      <div className="chat-messages" data-testid="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-label">Ask about delays, risk, or dispatch timing.</div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`chat-message ${message.role}`}
              data-testid={`chat-message-${message.role}-${index}`}
            >
              <strong>{message.role === "user" ? "You" : "AI"}:</strong> {message.text}
            </div>
          ))
        )}
      </div>

      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="input"
          value={draft}
          onInput={(event) => setDraft(event.currentTarget.value)}
          placeholder="Ask about this scenario..."
          disabled={isDisabled}
          data-testid="chat-input"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isDisabled || isLoading}
          data-testid="chat-send-button"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
