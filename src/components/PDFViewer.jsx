import { useEffect, useRef, useState } from 'react'
import { pdfjsLib } from '../hooks/usePDF'
import './PDFViewer.css'

const MIN_WIDTH = 180
const MAX_WIDTH = 900
const DEFAULT_WIDTH = 380

function PageThumbnail({ pdfDoc, pageNum, isCurrent, onClick, scale }) {
  const canvasRef = useRef()
  const containerRef = useRef()
  const [rendered, setRendered] = useState(false)
  const renderingRef = useRef(false)

  // Re-render when scale changes
  useEffect(() => {
    setRendered(false)
    renderingRef.current = false
  }, [scale])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) renderPage() },
      { threshold: 0.05 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [pdfDoc, pageNum, scale])

  useEffect(() => {
    if (isCurrent && !rendered) renderPage()
  }, [isCurrent, rendered])

  async function renderPage() {
    if (renderingRef.current || !canvasRef.current) return
    renderingRef.current = true
    try {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      setRendered(true)
    } catch {
      // ignore
    } finally {
      renderingRef.current = false
    }
  }

  return (
    <div
      ref={containerRef}
      className={`pdf-page-thumb ${isCurrent ? 'current' : ''}`}
      onClick={onClick}
      title={`Page ${pageNum}`}
    >
      <canvas ref={canvasRef} className={`pdf-canvas ${rendered ? 'visible' : ''}`} />
      {!rendered && <div className="pdf-page-placeholder" />}
      <div className="pdf-page-num">{pageNum}</div>
    </div>
  )
}

export default function PDFViewer({ book, currentPage, onPageClick }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [scale, setScale] = useState(0.5)
  const currentRef = useRef()
  const panelRef = useRef()
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  // Compute thumbnail scale from panel width
  useEffect(() => {
    // A4 page is ~595px wide at 1.0 scale — fit to panel with padding
    const newScale = Math.max(0.15, Math.min(1.5, (width - 24) / 595))
    setScale(parseFloat(newScale.toFixed(2)))
  }, [width])

  useEffect(() => {
    if (!book?.renderBuffer) return
    pdfjsLib.getDocument({ data: book.renderBuffer.slice(0) }).promise
      .then(setPdfDoc)
      .catch(console.error)
  }, [book])

  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentPage])

  // Drag-to-resize logic
  function onDragStart(e) {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return
      // Drag left = wider panel (panel is on the right)
      const delta = startX.current - e.clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setWidth(newWidth)
    }
    function onMouseUp() {
      if (!dragging.current) return
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="pdf-viewer-panel" ref={panelRef} style={{ width }}>
      {/* Drag handle on the left edge */}
      <div className="pdf-resize-handle" onMouseDown={onDragStart} title="Drag to resize" />

      <div className="pdf-viewer-header">
        <span>Pages</span>
        <span className="pdf-page-counter">{currentPage} / {book.pageCount}</span>
      </div>

      {!pdfDoc ? (
        <div className="pdf-viewer-loading">Loading pages…</div>
      ) : (
        <div className="pdf-viewer-scroll">
          {Array.from({ length: book.pageCount }, (_, i) => {
            const pageNum = i + 1
            const isCurrent = pageNum === currentPage
            return (
              <div key={`${pageNum}-${scale}`} ref={isCurrent ? currentRef : null}>
                <PageThumbnail
                  pdfDoc={pdfDoc}
                  pageNum={pageNum}
                  isCurrent={isCurrent}
                  onClick={() => onPageClick(pageNum)}
                  scale={scale}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
