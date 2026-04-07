import './ReaderSettings.css'

const HIGHLIGHT_COLORS = [
  { label: 'Purple',  value: '#c084fc' },
  { label: 'Cyan',    value: '#22d3ee' },
  { label: 'Green',   value: '#4ade80' },
  { label: 'Yellow',  value: '#facc15' },
  { label: 'Orange',  value: '#fb923c' },
  { label: 'Pink',    value: '#f472b6' },
]

const MIN_FONT = 14
const MAX_FONT = 32

export default function ReaderSettings({ fontSize, onFontSize, highlightColor, onHighlightColor, onClose }) {
  return (
    <div className="reader-settings">
      <div className="rs-header">
        <span className="rs-title">Settings</span>
        <button className="rs-close-btn" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="rs-body">
        <div className="rs-section">
          <label className="rs-label">Font size</label>
          <div className="rs-font-row">
            <button
              className="rs-font-btn"
              onClick={() => onFontSize(s => Math.max(MIN_FONT, s - 2))}
              disabled={fontSize <= MIN_FONT}
            >A−</button>
            <span className="rs-font-val">{fontSize}px</span>
            <button
              className="rs-font-btn"
              onClick={() => onFontSize(s => Math.min(MAX_FONT, s + 2))}
              disabled={fontSize >= MAX_FONT}
            >A+</button>
          </div>
          <input
            type="range"
            className="rs-slider"
            min={MIN_FONT}
            max={MAX_FONT}
            step={2}
            value={fontSize}
            onChange={e => onFontSize(parseInt(e.target.value))}
          />
        </div>

        <div className="rs-section">
          <label className="rs-label">Highlight color</label>
          <div className="rs-colors">
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.value}
                className={`rs-color-btn ${highlightColor === c.value ? 'active' : ''}`}
                style={{ '--swatch': c.value }}
                onClick={() => onHighlightColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
        </div>

        <div className="rs-section rs-hint">
          <div className="rs-hint-row"><kbd>Space</kbd> Play / Pause</div>
          <div className="rs-hint-row"><kbd>←</kbd><kbd>→</kbd> Skip paragraph</div>
          <div className="rs-hint-row"><kbd>+</kbd><kbd>−</kbd> Font size</div>
          <div className="rs-hint-row"><kbd>B</kbd> Add bookmark</div>
          <div className="rs-hint-row"><kbd>Esc</kbd> Close panels</div>
        </div>
      </div>
    </div>
  )
}
