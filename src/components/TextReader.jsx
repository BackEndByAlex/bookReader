import { useEffect, useRef, useMemo } from 'react'
import './TextReader.css'

// Split a paragraph string into word tokens preserving spaces
function tokenize(text) {
  const tokens = []
  const regex = /(\S+|\s+)/g
  let match
  let wordIndex = 0
  while ((match = regex.exec(text)) !== null) {
    const isWord = /\S/.test(match[0])
    tokens.push({ text: match[0], isWord, wordIndex: isWord ? wordIndex++ : null })
  }
  return tokens
}

export default function TextReader({
  paragraphs,
  currentParagraph,
  highlightedWord,
  isPlaying,
}) {
  const containerRef = useRef()
  const highlightRef = useRef()

  // Scroll highlighted word into view smoothly
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedWord])

  // Scroll to current paragraph when it changes (when skipping)
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-para="${currentParagraph}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentParagraph])

  // Show a window of paragraphs: current ± context
  const visibleRange = useMemo(() => {
    const start = Math.max(0, currentParagraph - 2)
    const end = Math.min(paragraphs.length - 1, currentParagraph + 8)
    return { start, end }
  }, [currentParagraph, paragraphs.length])

  return (
    <div className="text-reader" ref={containerRef}>
      <div className="text-content">
        {Array.from({ length: visibleRange.end - visibleRange.start + 1 }, (_, i) => {
          const paraIndex = visibleRange.start + i
          const text = paragraphs[paraIndex]
          const isCurrent = paraIndex === currentParagraph
          const tokens = isCurrent ? tokenize(text) : null

          return (
            <p
              key={paraIndex}
              data-para={paraIndex}
              className={`para ${isCurrent ? 'current' : ''} ${paraIndex < currentParagraph ? 'past' : ''}`}
            >
              {isCurrent && tokens ? (
                tokens.map((token, ti) => {
                  if (!token.isWord) return token.text
                  const isHighlighted =
                    highlightedWord?.paragraphIndex === paraIndex &&
                    highlightedWord?.wordIndex === token.wordIndex
                  return (
                    <span
                      key={ti}
                      className={`word ${isHighlighted ? 'highlighted' : ''}`}
                      ref={isHighlighted ? highlightRef : null}
                    >
                      {token.text}
                    </span>
                  )
                })
              ) : (
                text
              )}
            </p>
          )
        })}
      </div>
    </div>
  )
}
