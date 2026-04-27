import { useEffect, useRef, useState } from "preact/hooks";

export default function ReasoningCard({ reasoning, onRefresh, canRefresh, isRefreshing }) {
  const [msg, setMsg] = useState("");
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pos, setPos] = useState({ left: null, top: null });
  const [size, setSize] = useState({ width: null, height: null });
  const panelRef = useRef(null);

  useEffect(() => {
    if (!reasoning) return undefined;
    // Do not show the floating window for the initial placeholder prompt
    const DEFAULT_PROMPT = "Compute a route to begin.";
    if (reasoning.trim() === DEFAULT_PROMPT) {
      setMsg("");
      setClosing(false);
      setVisible(false);
      return undefined;
    }
    // show floating window with neon border
    setMsg(reasoning);
    setClosing(false);
    setVisible(true);

    // auto-trigger close after 15s with fade
    const fadeDelay = 15000;
    const fadeDuration = 420; // matches CSS transition
    const t1 = setTimeout(() => setClosing(true), fadeDelay);
    const t2 = setTimeout(() => setVisible(false), fadeDelay + fadeDuration);

    // When first shown, center it and set default size if not set
    if (panelRef.current && size.width == null) {
      const rect = panelRef.current.getBoundingClientRect();
      const w = Math.min(window.innerWidth * 0.6, 640);
      const h = Math.max(120, rect.height);
      setSize({ width: Math.round(w), height: Math.round(h) });
      setPos({ left: Math.round((window.innerWidth - w) / 2), top: Math.round((window.innerHeight - h) / 2) });
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reasoning]);

  // Drag handling
  function onHeaderPointerDown(e) {
    if (!panelRef.current) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = panelRef.current.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    function onMove(ev) {
      const nx = ev.clientX - offsetX;
      const ny = ev.clientY - offsetY;
      const w = panelRef.current.offsetWidth;
      const h = panelRef.current.offsetHeight;
      const clampedX = Math.max(8, Math.min(nx, window.innerWidth - w - 8));
      const clampedY = Math.max(8, Math.min(ny, window.innerHeight - h - 8));
      setPos({ left: clampedX, top: clampedY });
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  // update size after user resizes (reads DOM on pointerup)
  useEffect(() => {
    function onPointerUp() {
      if (!panelRef.current) return;
      const r = panelRef.current.getBoundingClientRect();
      setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    }
    document.addEventListener('pointerup', onPointerUp);
    return () => document.removeEventListener('pointerup', onPointerUp);
  }, []);

  function closeWindow() {
    setClosing(true);
    setTimeout(() => setVisible(false), 420);
  }

  return (
    <section className="reasoning-card" data-testid="reasoning-card">
      {visible ? (
        <div
          ref={panelRef}
          className={`floating-flash ${closing ? 'closing' : ''}`}
          role="dialog"
          aria-live="polite"
          style={pos.left != null && pos.top != null ? { left: pos.left + 'px', top: pos.top + 'px', transform: 'none', width: size.width ? size.width + 'px' : undefined, height: size.height ? size.height + 'px' : undefined } : undefined}
        >
          <div className="floating-flash-header" onPointerDown={onHeaderPointerDown}>
            <div className="floating-flash-title">AI Summary</div>
            <button aria-label="Close summary" className="floating-flash-close" onClick={closeWindow}>×</button>
          </div>
          <div className="floating-flash-body">{msg}</div>
        </div>
      ) : null}

      <div className="section-header">
        <div className="section-icon amber">
          <span className="lucide" data-lucide="lightbulb" style={{ width: 16, height: 16 }} />
        </div>
        <span className="section-title">AI Summary</span>
        <button
          type="button"
          className="btn btn-subtle btn-sm"
          onClick={onRefresh}
          disabled={!canRefresh || isRefreshing}
          data-testid="refresh-reasoning-button"
        >
          {isRefreshing ? "Refreshing..." : "Refresh reasoning"}
        </button>
      </div>
      <p className="reasoning-copy">
        {reasoning || "Compute a route and select disruptions to generate a scenario-aware operational summary."}
      </p>
    </section>
  );
}
