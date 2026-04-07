import { useState, useEffect } from 'react'
import { useLibrary } from './hooks/useLibrary'
import { useTTS } from './hooks/useTTS'
import { useBookmarks } from './hooks/useBookmarks'
import { useReadingStats } from './hooks/useReadingStats'
import Library from './pages/Library'
import TextReader from './components/TextReader'
import Controls from './components/Controls'
import BookmarkPanel from './components/BookmarkPanel'
import ChapterMenu from './components/ChapterMenu'
import ReaderSettings from './components/ReaderSettings'
import PDFViewer from './components/PDFViewer'
import './App.css'

const DEFAULT_FONT_SIZE = 20
const DEFAULT_HIGHLIGHT = '#c084fc'

export default function App() {
  const library = useLibrary()
  const tts = useTTS()
  const { addBookmark, removeBookmark, bookmarksForBook } = useBookmarks()

  const [view, setView] = useState('library') // 'library' | 'reader'
  const [currentBook, setCurrentBook] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [showPDF, setShowPDF] = useState(true)
  const [showChapters, setShowChapters] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)
  const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT)

  const stats = useReadingStats(
    currentBook?.paragraphs ?? [],
    tts.currentParagraph,
    tts.isPlaying
  )

  const bookmarks = currentBook ? bookmarksForBook(currentBook.title) : []
  const currentPage = currentBook?.paragraphPages?.[tts.currentParagraph] ?? 1

  async function doSaveProgress() {
    if (!currentBook) return
    await library.saveProgress(currentBook.id, tts.currentParagraph, stats.getSessionMs())
    stats.reset()
  }

  async function handleOpenBook(id) {
    const book = await library.openBook(id)
    if (!book) return
    setCurrentBook(book)
    setView('reader')
    setHasStarted(false)
    setShowBookmarks(false)
    setShowChapters(false)
    setShowSettings(false)
    // Restore last position without starting playback
    if (book.lastParagraph > 0) {
      tts.jumpTo(book.lastParagraph)
    }
  }

  async function handleAddBook(file) {
    const book = await library.addBook(file)
    if (!book) return
    setCurrentBook(book)
    setView('reader')
    setHasStarted(false)
  }

  async function handleBackToLibrary() {
    await doSaveProgress()
    tts.stop()
    setCurrentBook(null)
    setView('library')
    setHasStarted(false)
    setShowBookmarks(false)
    setShowChapters(false)
    setShowSettings(false)
  }

  // ---- Playback handlers ----

  function handlePlay() {
    if (!currentBook) return
    if (!hasStarted) {
      tts.play(currentBook.paragraphs, tts.currentParagraph)
      setHasStarted(true)
    } else {
      tts.resume()
    }
  }

  function handlePause() {
    tts.pause()
    doSaveProgress()
  }

  function handleSkipBack() {
    if (!currentBook) return
    if (!hasStarted) { tts.play(currentBook.paragraphs, 0); setHasStarted(true); return }
    tts.skipBack()
  }

  function handleSkipForward() {
    if (!currentBook) return
    if (!hasStarted) { tts.play(currentBook.paragraphs, 0); setHasStarted(true); return }
    tts.skipForward()
  }

  function handleRestart() {
    if (!currentBook) return
    tts.play(currentBook.paragraphs, 0)
    setHasStarted(true)
  }

  function handleEnd() {
    if (!currentBook) return
    tts.stop()
    tts.jumpTo(currentBook.paragraphs.length - 1)
  }

  function handleJumpTo(paraIndex) {
    if (!currentBook) return
    if (tts.isPlaying) {
      tts.jumpTo(paraIndex)
    } else {
      tts.play(currentBook.paragraphs, paraIndex)
      setHasStarted(true)
    }
  }

  function handleProgressClick(paraIndex) {
    if (!currentBook) return
    tts.play(currentBook.paragraphs, paraIndex)
    setHasStarted(true)
  }

  function handlePageClick(pageNum) {
    if (!currentBook) return
    const paraIndex = currentBook.pageStarts?.[pageNum]
    if (paraIndex !== undefined) handleJumpTo(paraIndex)
  }

  function handleAddBookmark() {
    if (!currentBook) return
    const preview = currentBook.paragraphs[tts.currentParagraph]?.slice(0, 80).trim()
    addBookmark(currentBook.title, tts.currentParagraph, preview)
  }

  // ---- Keyboard shortcuts (reader only) ----
  useEffect(() => {
    if (view !== 'reader') return
    function onKey(e) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          tts.isPlaying ? handlePause() : handlePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSkipBack()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSkipForward()
          break
        case 'KeyB':
          handleAddBookmark()
          break
        case 'Equal':
        case 'NumpadAdd':
          setFontSize(s => Math.min(32, s + 2))
          break
        case 'Minus':
        case 'NumpadSubtract':
          setFontSize(s => Math.max(14, s - 2))
          break
        case 'Escape':
          setShowBookmarks(false)
          setShowChapters(false)
          setShowSettings(false)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, tts.isPlaying, currentBook]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Library view ----
  if (view === 'library') {
    return (
      <Library
        books={library.books}
        loading={library.loading}
        error={library.error}
        onOpenBook={handleOpenBook}
        onAddBook={handleAddBook}
      />
    )
  }

  // ---- Reader view ----
  const hasChapters = currentBook.chapters?.length > 0

  return (
    <div className="reader-layout">
      {/* Top bar */}
      <div className="top-bar">
        <button className="top-back-btn" onClick={handleBackToLibrary}>← Library</button>
        <div className="top-title">
          <span className="top-title-icon">📖</span>
          <span className="top-title-text">{currentBook.title}</span>
        </div>
        <div className="top-bar-right">
          <span className="top-meta">{currentBook.pageCount} pages</span>
          {hasChapters && (
            <button
              className={`top-toggle-btn ${showChapters ? 'active' : ''}`}
              onClick={() => { setShowChapters(v => !v); setShowSettings(false) }}
              title="Chapters"
            >
              Chapters
            </button>
          )}
          <button
            className={`top-toggle-btn ${showSettings ? 'active' : ''}`}
            onClick={() => { setShowSettings(v => !v); setShowChapters(false) }}
            title="Settings"
          >
            ⚙
          </button>
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
          paragraphs={currentBook.paragraphs}
          currentParagraph={tts.currentParagraph}
          highlightedWord={tts.highlightedWord}
          isPlaying={tts.isPlaying}
          fontSize={fontSize}
          highlightColor={highlightColor}
        />

        {showChapters && hasChapters && (
          <ChapterMenu
            chapters={currentBook.chapters}
            currentParagraph={tts.currentParagraph}
            onJump={paraIndex => { handleJumpTo(paraIndex); setShowChapters(false) }}
            onClose={() => setShowChapters(false)}
          />
        )}

        {showSettings && (
          <ReaderSettings
            fontSize={fontSize}
            onFontSize={setFontSize}
            highlightColor={highlightColor}
            onHighlightColor={setHighlightColor}
            onClose={() => setShowSettings(false)}
          />
        )}

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
            book={currentBook}
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
        totalParagraphs={currentBook.paragraphs.length}
        onProgressClick={handleProgressClick}
        onAddBookmark={handleAddBookmark}
        bookmarkCount={bookmarks.length}
        onShowBookmarks={() => setShowBookmarks(v => !v)}
        wpm={stats.wpm}
        etaMin={stats.etaMin}
      />
    </div>
  )
}
