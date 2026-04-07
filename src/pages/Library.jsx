import { useRef } from 'react'
import './Library.css'

function formatRelative(isoDate) {
  if (!isoDate) return null
  const diff = Date.now() - new Date(isoDate)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDuration(ms) {
  if (!ms) return null
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return null
  if (mins < 60) return `${mins}m read`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem > 0 ? `${hrs}h ${rem}m read` : `${hrs}h read`
}

export default function Library({ books, loading, error, onOpenBook, onAddBook }) {
  const fileRef = useRef()

  function handleFile(file) {
    if (file && (file.type === 'application/pdf' || file.name?.endsWith('.pdf'))) {
      onAddBook(file)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div className="library" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
      <div className="library-header">
        <div className="library-title">
          <span className="library-icon">📚</span>
          My Library
        </div>
        <button className="lib-add-btn" onClick={() => fileRef.current?.click()}>
          + Add Book
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }}
        />
      </div>

      {error && <div className="lib-error">{error}</div>}

      {loading && (
        <div className="lib-loading">
          <div className="lib-spinner" />
          <span>Processing book…</span>
        </div>
      )}

      {!loading && books.length === 0 ? (
        <div className="lib-empty">
          <div className="lib-empty-icon">📖</div>
          <p className="lib-empty-text">No books yet</p>
          <p className="lib-empty-sub">
            Drop a PDF here or click <strong>+ Add Book</strong>
          </p>
        </div>
      ) : (
        <div className="lib-grid">
          {books.map(book => {
            const pct = book.paragraphCount > 0
              ? Math.min(100, Math.round((book.lastParagraph / book.paragraphCount) * 100))
              : 0
            const duration = formatDuration(book.totalReadingMs)
            const lastRead = formatRelative(book.lastReadAt)

            return (
              <div key={book.id} className="lib-card" onClick={() => onOpenBook(book.id)}>
                <div className="lib-thumb">
                  {book.thumbnail
                    ? <img src={book.thumbnail} alt={book.title} />
                    : <div className="lib-thumb-placeholder">📄</div>
                  }
                  {pct === 100 && <div className="lib-done-badge">Done</div>}
                </div>
                <div className="lib-card-body">
                  <div className="lib-card-title" title={book.title}>{book.title}</div>
                  <div className="lib-card-meta">
                    {book.pageCount} pages
                    {book.chapterCount > 0 && ` · ${book.chapterCount} ch`}
                  </div>
                  {duration && <div className="lib-card-time">{duration}</div>}
                  <div className="lib-progress-wrap">
                    <div className="lib-progress-bar">
                      <div className="lib-progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="lib-progress-pct">{pct}%</span>
                  </div>
                  {lastRead && <div className="lib-card-last">{lastRead}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
