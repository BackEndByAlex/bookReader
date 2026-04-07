import { useEffect, useRef, useState, useCallback } from 'react'
import { pdfjsLib } from '../hooks/usePDF'
import './PDFViewer.css'

const THUMBNAIL_SCALE = 0.28

function PageThumbnail({ pdfDoc, pageNum, isCurrent, onClick }) {
  const canvasRef = useRef()
  const [rendered, setRendered] = useState(false)
  const containerRef = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) renderPage() },
      { threshold: 0.1 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [pdfDoc, pageNum])

  // Re-render when it becomes current (scroll into view handled by parent)
  useEffect(() => {
    if (isCurrent && !rendered) renderPage()
  }, [isCurrent])

  async function renderPage() {
    if (rendered || !canvasRef.current) return
    try {
      const page = await pdfDoc.getPage(pageNum)
      const viewport = page.getViewport({ scale: THUMBNAIL_SCALE })
      const canvas = canvasRef.current
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      setRendered(true)
    } catch {
      // page render failed, ignore
    }
  }

  return (
    <div
      ref={containerRef}
      className={`pdf-page-thumb ${isCurrent ? 'current' : ''}`}
      onClick={onClick}
      title={`Page ${pageNum}`}
    >
      <canvas ref={canvasRef} className="pdf-canvas" />
      {!rendered && <div className="pdf-page-placeholder" />}
      <div className="pdf-page-num">{pageNum}</div>
    </div>
  )
}

export default function PDFViewer({ book, currentPage, onPageClick }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const currentRef = useRef()

  // Load the PDF doc from the stored render buffer
  useEffect(() => {
    if (!book?.renderBuffer) return
    pdfjsLib.getDocument({ data: book.renderBuffer.slice(0) }).promise
      .then(setPdfDoc)
      .catch(console.error)
  }, [book])

  // Scroll current page thumbnail into view
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentPage])

  if (!pdfDoc) return (
    <div className="pdf-viewer-panel">
      <div className="pdf-viewer-loading">Loading pages…</div>
    </div>
  )

  return (
    <div className="pdf-viewer-panel">
      <div className="pdf-viewer-header">
        Pages
        <span className="pdf-page-counter">{currentPage} / {book.pageCount}</span>
      </div>
      <div className="pdf-viewer-scroll">
        {Array.from({ length: book.pageCount }, (_, i) => {
          const pageNum = i + 1
          const isCurrent = pageNum === currentPage
          return (
            <div key={pageNum} ref={isCurrent ? currentRef : null}>
              <PageThumbnail
                pdfDoc={pdfDoc}
                pageNum={pageNum}
                isCurrent={isCurrent}
                onClick={() => onPageClick(pageNum)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
