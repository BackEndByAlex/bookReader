import { pdfjsLib } from '../hooks/usePDF'

// Detect if a short line looks like a chapter heading
function isChapterHeading(text) {
  const t = text.trim()
  if (!t || t.length > 80 || t.split(' ').length > 10) return false
  if (/^(chapter|part|section|prologue|epilogue|preface|introduction|afterword|appendix|interlude)\b/i.test(t)) return true
  if (/^\d+[\.\:\s]/.test(t) && t.split(' ').length <= 7) return true
  if (t === t.toUpperCase() && t.replace(/\s/g, '').length > 2 && !/^\d+$/.test(t)) return true
  return false
}

export async function extractBook(arrayBuffer, title) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

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

  // Merge lines into paragraphs, track page + detect chapter headings
  const paragraphs = []  // { text, pageNum, isChapter }
  let current = ''
  let currentPage = 1

  for (const { text, pageNum } of allLines) {
    if (!text) continue

    // Chapter headings break paragraphs
    if (isChapterHeading(text)) {
      if (current.trim() && current.split(' ').length >= 4) {
        paragraphs.push({ text: current.trim(), pageNum: currentPage, isChapter: false })
        current = ''
      }
      paragraphs.push({ text: text.trim(), pageNum, isChapter: true })
      currentPage = pageNum
      continue
    }

    if (!current) currentPage = pageNum
    current += (current ? ' ' : '') + text
    if (/[.!?…"'»]\s*$/.test(text) && current.split(' ').length > 10) {
      paragraphs.push({ text: current.trim(), pageNum: currentPage, isChapter: false })
      current = ''
    }
  }
  if (current.trim()) paragraphs.push({ text: current.trim(), pageNum: currentPage, isChapter: false })

  const clean = paragraphs.filter(p => p.text.split(' ').length >= 4 || p.isChapter)
  if (clean.length === 0) throw new Error('Could not extract readable text from this PDF.')

  // Build derived data
  const paraTexts = clean.map(p => p.text)
  const paragraphPages = clean.map(p => p.pageNum)
  const pageStarts = {}
  clean.forEach(({ pageNum }, i) => { if (pageStarts[pageNum] === undefined) pageStarts[pageNum] = i })

  const chapters = clean
    .map((p, i) => p.isChapter ? { title: p.text, paragraphIndex: i } : null)
    .filter(Boolean)

  // Generate thumbnail (first page at small scale) — returns base64 JPEG
  let thumbnail = null
  try {
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 0.35 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    thumbnail = canvas.toDataURL('image/jpeg', 0.75)
  } catch { /* thumbnail optional */ }

  return {
    title,
    paragraphs: paraTexts,
    paragraphPages,
    pageStarts,
    pageCount: pdf.numPages,
    chapters,
    thumbnail,
  }
}
