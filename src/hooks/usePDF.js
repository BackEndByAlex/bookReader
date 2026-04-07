import { useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export { pdfjsLib }

export function usePDF() {
  const [book, setBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPDF = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    setBook(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      // Keep a second copy for rendering — getDocument consumes the first
      const renderBuffer = arrayBuffer.slice(0)
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      // Extract text per page, tracking page number for each line
      const allLines = [] // { text, pageNum }

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const content = await page.getTextContent()

        let line = ''
        let lastY = null

        for (const item of content.items) {
          if (!item.str) continue
          const y = item.transform[5]
          const isNewLine = lastY !== null && Math.abs(y - lastY) > 5

          if (isNewLine) {
            if (line.trim()) allLines.push({ text: line.trim(), pageNum })
            line = item.str
          } else {
            line += (line && !line.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str
          }
          lastY = y
        }
        if (line.trim()) allLines.push({ text: line.trim(), pageNum })
      }

      // Merge lines into paragraphs, carrying the page number of the first line
      const paragraphs = []  // { text, pageNum }
      let current = ''
      let currentPage = 1

      for (const { text, pageNum } of allLines) {
        if (!text) continue
        if (!current) currentPage = pageNum
        current += (current ? ' ' : '') + text
        if (/[.!?…"'»]\s*$/.test(text) && current.split(' ').length > 10) {
          paragraphs.push({ text: current.trim(), pageNum: currentPage })
          current = ''
        }
      }
      if (current.trim()) paragraphs.push({ text: current.trim(), pageNum: currentPage })

      const clean = paragraphs.filter(p => p.text.split(' ').length >= 4)
      if (clean.length === 0) throw new Error('Could not extract readable text from this PDF.')

      // Build page → first paragraph index map
      const pageStarts = {}
      clean.forEach(({ pageNum }, i) => {
        if (pageStarts[pageNum] === undefined) pageStarts[pageNum] = i
      })

      setBook({
        title: file.name.replace(/\.pdf$/i, ''),
        paragraphs: clean.map(p => p.text),
        paragraphPages: clean.map(p => p.pageNum),
        pageStarts,
        pageCount: pdf.numPages,
        renderBuffer, // keep for PDF.js page rendering
      })
    } catch (err) {
      setError(err.message || 'Failed to load PDF.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { book, loading, error, loadPDF }
}
