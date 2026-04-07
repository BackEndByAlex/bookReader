import './Controls.css'

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function Controls({
  isPlaying,
  isLoading,
  onPlay,
  onPause,
  onSkipBack,
  onSkipForward,
  onRestart,
  onEnd,
  speed,
  onSpeedChange,
  voices,
  selectedVoice,
  onVoiceChange,
  currentParagraph,
  totalParagraphs,
  onProgressClick,
  onAddBookmark,
  bookmarkCount,
  onShowBookmarks,
}) {
  const progress = totalParagraphs > 0 ? (currentParagraph / totalParagraphs) * 100 : 0

  function handleProgressClick(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    onProgressClick(Math.floor(pct * totalParagraphs))
  }

  return (
    <div className="controls">
      {/* Progress bar */}
      <div className="progress-bar" onClick={handleProgressClick} title="Click to jump">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <div className="progress-thumb" style={{ left: `${progress}%` }} />
      </div>

      <div className="controls-row">
        {/* Playback */}
        <div className="control-group playback">
          <button className="ctrl-btn" onClick={onRestart} title="Restart">⏮</button>
          <button className="ctrl-btn" onClick={onSkipBack} title="Previous paragraph">⏪</button>
          <button className="ctrl-btn play-btn" onClick={isPlaying ? onPause : onPlay} title={isPlaying ? 'Pause' : 'Play'} disabled={isLoading}>
            {isLoading ? <span className="loading-spin">⟳</span> : isPlaying ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn" onClick={onSkipForward} title="Next paragraph">⏩</button>
          <button className="ctrl-btn" onClick={onEnd} title="Go to end">⏭</button>
        </div>

        {/* Progress label */}
        <div className="progress-label">
          {currentParagraph + 1} / {totalParagraphs}
        </div>

        {/* Speed */}
        <div className="control-group">
          <select
            className="ctrl-select"
            value={speed}
            onChange={e => onSpeedChange(parseFloat(e.target.value))}
            title="Playback speed"
          >
            {SPEED_OPTIONS.map(s => (
              <option key={s} value={s}>{s}×</option>
            ))}
          </select>
        </div>

        {/* Bookmark actions */}
        <div className="control-group">
          <button className="ctrl-btn bookmark-btn" onClick={onAddBookmark} title="Add bookmark">🔖</button>
          <button className="ctrl-btn bookmarks-list-btn" onClick={onShowBookmarks} title="View bookmarks">
            📚 {bookmarkCount > 0 && <span className="bm-badge">{bookmarkCount}</span>}
          </button>
        </div>
      </div>

      {/* Voice selector row */}
      <div className="voice-row">
        <label className="voice-label">Voice</label>
        <select
          className="ctrl-select voice-select"
          value={selectedVoice?.name || ''}
          onChange={e => {
            const v = voices.find(v => v.name === e.target.value)
            if (v) onVoiceChange(v)
          }}
        >
          {voices.map(v => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang}){/natural|neural|online/i.test(v.name) ? ' ★' : ''}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
