import './ChapterMenu.css'

export default function ChapterMenu({ chapters, currentParagraph, onJump, onClose }) {
  // Find the current chapter index
  const activeIdx = chapters.reduce((found, ch, i) => {
    return ch.paragraphIndex <= currentParagraph ? i : found
  }, -1)

  return (
    <div className="chapter-menu">
      <div className="chapter-menu-header">
        <span className="chapter-menu-title">Chapters</span>
        <button className="chapter-close-btn" onClick={onClose} title="Close">✕</button>
      </div>
      <div className="chapter-list">
        {chapters.map((ch, i) => (
          <button
            key={i}
            className={`chapter-item ${i === activeIdx ? 'active' : ''}`}
            onClick={() => onJump(ch.paragraphIndex)}
            title={ch.title}
          >
            <span className="chapter-num">{i + 1}</span>
            <span className="chapter-name">{ch.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
