import { useState, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export function usePDF() {
  const [book, setBook] = useState(null)   // { title, paragraphs: string[] }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPDF = useCallback(async (file) => {
    setLoading(true)
    setError(null)
    setBook(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      const allText = []

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const content = await page.getTextContent()

        // Reconstruct text lines from items, preserving paragraph breaks
        let line = ''
        let lastY = null

        for (const item of content.items) {
          if (!item.str) continue

          const y = item.transform[5]
          const isNewLine = lastY !== null && Math.abs(y - lastY) > 5

          if (isNewLine) {
            if (line.trim()) allText.push(line.trim())
            line = item.str
          } else {
            line += (line && !line.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str
          }
          lastY = y
        }
        if (line.trim()) allText.push(line.trim())
      }

      // Merge short lines into paragraphs (lines ending with a period are paragraph breaks)
      const paragraphs = []
      let current = ''

      for (const line of allText) {
        if (!line) continue
        current += (current ? ' ' : '') + line
        // Treat as paragraph end if line ends with sentence-ending punctuation
        if (/[.!?…"'»]\s*$/.test(line) && current.split(' ').length > 10) {
          paragraphs.push(current.trim())
          current = ''
        }
      }
      if (current.trim()) paragraphs.push(current.trim())

      // Filter out very short or junk paragraphs (page numbers, headers)
      const clean = paragraphs.filter(p => p.split(' ').length >= 4)

      if (clean.length === 0) throw new Error('Could not extract readable text from this PDF.')

      setBook({
        title: file.name.replace(/\.pdf$/i, ''),
        paragraphs: clean,
        pageCount: pdf.numPages,
      })
    } catch (err) {
      setError(err.message || 'Failed to load PDF.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { book, loading, error, loadPDF }
}
