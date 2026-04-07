import { useState } from 'react'
import { usePDF } from './hooks/usePDF'
import { useTTS } from './hooks/useTTS'
import { useBookmarks } from './hooks/useBookmarks'
import DropZone from './components/DropZone'
import TextReader from './components/TextReader'
import Controls from './components/Controls'
import BookmarkPanel from './components/BookmarkPanel'
import PDFViewer from './components/PDFViewer'
import './App.css'

export default function App() {
  const { book, loading, error, loadPDF } = usePDF()
  const tts = useTTS()
  const { addBookmark, removeBookmark, bookmarksForBook } = useBookmarks()
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showPDF, setShowPDF] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const bookmarks = book ? bookmarksForBook(book.title) : []

  // Current PDF page based on current paragraph
  const currentPage = book?.paragraphPages?.[tts.currentParagraph] ?? 1

  function handlePlay() {
    if (!book) return
    if (!hasStarted) { tts.play(book.paragraphs, tts.currentParagraph); setHasStarted(true) }
    else tts.resume()
  }

  function handlePause() { tts.pause() }

  function handleSkipBack() {
    if (!book) return
    if (!hasStarted) { tts.play(book.paragraphs, 0); setHasStarted(true); return }
    tts.skipBack()
  }

  function handleSkipForward() {
    if (!book) return
    if (!hasStarted) { tts.play(book.paragraphs, 0); setHasStarted(true); return }
    tts.skipForward()
  }

  function handleRestart() {
    if (!book) return
    tts.play(book.paragraphs, 0)
    setHasStarted(true)
  }

  function handleEnd() {
    if (!book) return
    tts.stop()
    tts.jumpTo(book.paragraphs.length - 1)
  }

  function handleJumpTo(paraIndex) {
    if (!book) return
    if (tts.isPlaying) tts.jumpTo(paraIndex)
    else { tts.play(book.paragraphs, paraIndex); setHasStarted(true) }
  }

  function handleProgressClick(paraIndex) {
    if (!book) return
    tts.play(book.paragraphs, paraIndex)
    setHasStarted(true)
  }

  function handlePageClick(pageNum) {
    if (!book) return
    // Jump to the first paragraph on that page
    const paraIndex = book.pageStarts?.[pageNum]
    if (paraIndex !== undefined) handleJumpTo(paraIndex)
  }

  function handleAddBookmark() {
    if (!book) return
    const preview = book.paragraphs[tts.currentParagraph]?.slice(0, 80).trim()
    addBookmark(book.title, tts.currentParagraph, preview)
  }

  function handleNewBook() {
    tts.stop()
    setHasStarted(false)
    setShowBookmarks(false)
    window.location.reload()
  }

  if (!book) {
    return <DropZone onFile={loadPDF} loading={loading} error={error} />
  }

  return (
    <div className="reader-layout">
      {/* Top bar */}
      <div className="top-bar">
        <button className="top-back-btn" onClick={handleNewBook}>← Library</button>
        <div className="top-title">
          <span className="top-title-icon">📖</span>
          <span className="top-title-text">{book.title}</span>
        </div>
        <div className="top-bar-right">
          <span className="top-meta">{book.pageCount} pages</span>
          <button
            className={`top-toggle-btn ${showPDF ? 'active' : ''}`}
            onClick={() => setShowPDF(v => !v)}
            title="Toggle PDF panel"
          >
            Pages
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="reader-main">
        <TextReader
          paragraphs={book.paragraphs}
          currentParagraph={tts.currentParagraph}
          highlightedWord={tts.highlightedWord}
          isPlaying={tts.isPlaying}
        />

        {showBookmarks && (
          <BookmarkPanel
            bookmarks={bookmarks}
            onJump={handleJumpTo}
            onRemove={removeBookmark}
            onClose={() => setShowBookmarks(false)}
          />
        )}

        {showPDF && (
          <PDFViewer
            book={book}
            currentPage={currentPage}
            onPageClick={handlePageClick}
          />
        )}
      </div>

      {/* Controls */}
      <Controls
        isPlaying={tts.isPlaying}
        isLoading={tts.isLoading}
        onPlay={handlePlay}
        onPause={handlePause}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onRestart={handleRestart}
        onEnd={handleEnd}
        speed={tts.speed}
        onSpeedChange={tts.setSpeed}
        voices={tts.voices}
        selectedVoice={tts.selectedVoice}
        onVoiceChange={tts.setSelectedVoice}
        currentParagraph={tts.currentParagraph}
        totalParagraphs={book.paragraphs.length}
        onProgressClick={handleProgressClick}
        onAddBookmark={handleAddBookmark}
        bookmarkCount={bookmarks.length}
        onShowBookmarks={() => setShowBookmarks(v => !v)}
      />
    </div>
  )
}
