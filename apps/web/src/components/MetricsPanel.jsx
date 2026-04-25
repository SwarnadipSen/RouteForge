function formatDistance(distanceM) {
  if (!Number.isFinite(distanceM)) {
    return "-";
  }
  return (distanceM / 1000).toFixed(1);
}

function formatDuration(durationS) {
  if (!Number.isFinite(durationS)) {
    return "-";
  }

  const totalMinutes = Math.round(durationS / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ");
}

function formatDurationDelta(currentS, baselineS) {
  if (!Number.isFinite(currentS) || !Number.isFinite(baselineS)) {
    return null;
  }
  const delta = currentS - baselineS;
  const formatted = formatDuration(Math.abs(delta));
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${formatted}`;
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `$${value.toFixed(0)}`;
}

function formatDelta(current, baseline, suffix = "") {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) {
    return null;
  }

  const delta = current - baseline;
  const sign = delta >= 0 ? "+" : "-";
  const absolute = Math.abs(delta);
  return `${sign}${absolute.toFixed(1)}${suffix}`;
}

function MetricCard({ title, value, baseline, delta, testId, suffix = "" }) {
  return (
    <div className="metric-card" data-testid={testId}>
      <div className="metric-title">{title}</div>
      <div className="metric-value mono">
        {value}
        {suffix}
      </div>
      {baseline ? <div className="metric-baseline">was {baseline}{suffix}</div> : null}
      {delta ? <div className="metric-delta">Δ {delta}</div> : null}
    </div>
  );
}

function calculateDurationSeconds(distanceM, speedKmh) {
  if (!Number.isFinite(distanceM) || !Number.isFinite(speedKmh) || speedKmh <= 0) {
    return NaN;
  }
  return (distanceM / 1000 / speedKmh) * 3600;
}

export default function MetricsPanel({
  baselineMetrics,
  rerouteMetrics,
  activeDisruption,
  vehicleSpeed,
  onVehicleSpeedChange,
}) {
  const currentMetrics = rerouteMetrics || baselineMetrics;
  const hasReroute = Boolean(rerouteMetrics && baselineMetrics);
  const currentDurationS = calculateDurationSeconds(currentMetrics?.distance_m, vehicleSpeed);
  const baselineDurationS = hasReroute
    ? calculateDurationSeconds(baselineMetrics.distance_m, vehicleSpeed)
    : null;

  return (
    <section className="metrics-panel" data-testid="metrics-panel">
      <div className="section-title-row">
        <span className="dot" />
        <span className="section-title">Metrics</span>
      </div>

      <MetricCard
        title="Distance"
        value={formatDistance(currentMetrics?.distance_m)}
        baseline={hasReroute ? formatDistance(baselineMetrics.distance_m) : null}
        delta={
          hasReroute
            ? formatDelta(currentMetrics.distance_m / 1000, baselineMetrics.distance_m / 1000, " km")
            : null
        }
        suffix=" km"
        testId="metric-distance-card"
      />

      <MetricCard
        title="Estimated Time"
        value={formatDuration(currentDurationS)}
        baseline={hasReroute ? formatDuration(baselineDurationS) : null}
        delta={hasReroute ? formatDurationDelta(currentDurationS, baselineDurationS) : null}
        testId="metric-time-card"
      />

      <div className="metric-card speed-card" data-testid="metric-speed-card">
        <div className="metric-title">Vehicle speed</div>
        <div className="metric-value mono">{vehicleSpeed} km/h</div>
        <input
          type="range"
          min="20"
          max="120"
          step="5"
          value={vehicleSpeed ?? 80}
          onInput={(event) => onVehicleSpeedChange(Number(event.currentTarget.value))}
          className="speed-slider"
          data-testid="speed-slider"
        />
      </div>

      <div className="metric-card" data-testid="metric-cost-risk-card">
        <div className="metric-title">Cost · Risk</div>
        <div className="metric-value mono">
          {formatCurrency(currentMetrics?.cost_usd)} · {currentMetrics?.risk_score ?? "-"}/100
        </div>
        {hasReroute ? (
          <div className="metric-baseline">
            was {formatCurrency(baselineMetrics.cost_usd)} · {baselineMetrics.risk_score}/100
          </div>
        ) : null}
      </div>

      <div className="metric-card" data-testid="metric-active-disruption-card">
        <div className="metric-title">Active disruption</div>
        <div className="metric-value amber-text">
          {activeDisruption?.type
            ? activeDisruption.type.replace(/_/g, " ")
            : "None"}
        </div>
      </div>
    </section>
  );
}
