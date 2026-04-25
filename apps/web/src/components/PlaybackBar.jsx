export default function PlaybackBar({
  playbackStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
}) {
  return (
    <div className="playback-bar" data-testid="playback-bar">
      <button
        type="button"
        className="playback-toggle"
        onClick={onTogglePlay}
        data-testid="playback-play-pause-button"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>

      <input
        type="range"
        min="0"
        max="2"
        step="1"
        value={playbackStep}
        onInput={(event) => onStepChange(Number(event.currentTarget.value))}
        className="playback-slider"
        data-testid="playback-slider"
      />

      <div className="playback-step-label mono" data-testid="playback-step-label">
        Step {playbackStep}: {playbackStep === 0 ? "baseline" : playbackStep === 1 ? "disruption" : "reroute"}
      </div>
    </div>
  );
}
