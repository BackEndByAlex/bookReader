import { useRef, useState, useEffect } from 'react'

export function useReadingStats(paragraphs, currentParagraph, isPlaying) {
  const sessionStartRef = useRef(null)
  const sessionMsRef = useRef(0)
  const [wpm, setWpm] = useState(0)
  const [etaMin, setEtaMin] = useState(null)

  // Track timer on play/pause
  useEffect(() => {
    if (isPlaying) {
      if (!sessionStartRef.current) sessionStartRef.current = Date.now()
    } else {
      if (sessionStartRef.current) {
        sessionMsRef.current += Date.now() - sessionStartRef.current
        sessionStartRef.current = null
      }
    }
  }, [isPlaying])

  // Recalculate WPM + ETA when paragraph advances
  useEffect(() => {
    if (currentParagraph < 2 || paragraphs.length === 0) return
    const elapsedMs = sessionMsRef.current + (sessionStartRef.current ? Date.now() - sessionStartRef.current : 0)
    const elapsedMin = elapsedMs / 60000
    if (elapsedMin < 0.3) return

    const wordsRead = paragraphs.slice(0, currentParagraph).reduce((n, p) => n + p.split(/\s+/).length, 0)
    if (wordsRead < 50) return

    const computedWpm = Math.round(wordsRead / elapsedMin)
    const wordsLeft = paragraphs.slice(currentParagraph).reduce((n, p) => n + p.split(/\s+/).length, 0)
    setWpm(computedWpm)
    setEtaMin(Math.ceil(wordsLeft / computedWpm))
  }, [currentParagraph]) // eslint-disable-line react-hooks/exhaustive-deps

  function getSessionMs() {
    return sessionMsRef.current + (sessionStartRef.current ? Date.now() - sessionStartRef.current : 0)
  }

  function reset() {
    sessionStartRef.current = null
    sessionMsRef.current = 0
    setWpm(0)
    setEtaMin(null)
  }

  return { wpm, etaMin, getSessionMs, reset }
}
