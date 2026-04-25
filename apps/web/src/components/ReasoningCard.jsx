export default function ReasoningCard({ reasoning }) {
  return (
    <section className="reasoning-card" data-testid="reasoning-card">
      <div className="section-title-row">
        <span className="dot" />
        <span className="section-title">Route reasoning</span>
      </div>
      <p className="reasoning-copy" data-testid="reasoning-text">
        {reasoning || "Compute a route and select live disruptions to see alternate-route reasoning."}
      </p>
    </section>
  );
}
