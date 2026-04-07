import './BookmarkPanel.css'

export default function BookmarkPanel({ bookmarks, onJump, onRemove, onClose }) {
  function formatDate(iso) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bm-panel">
      <div className="bm-header">
        <h2>Bookmarks</h2>
        <button className="bm-close" onClick={onClose}>✕</button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bm-empty">
          <span>🔖</span>
          <p>No bookmarks yet.</p>
          <p>Press the 🔖 button while reading to save your place.</p>
        </div>
      ) : (
        <div className="bm-list">
          {bookmarks.map(bm => (
            <div key={bm.id} className="bm-item">
              <div className="bm-item-top">
                <span className="bm-para-num">¶ {bm.paragraphIndex + 1}</span>
                <span className="bm-date">{formatDate(bm.date)}</span>
              </div>
              <p className="bm-preview">"{bm.previewText}"</p>
              <div className="bm-actions">
                <button className="bm-jump-btn" onClick={() => { onJump(bm.paragraphIndex); onClose() }}>
                  Jump here
                </button>
                <button className="bm-remove-btn" onClick={() => onRemove(bm.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
