import { useState, useRef, useCallback, useEffect } from 'react'

const API = ''  // relative — works in both dev (via Vite proxy) and prod

export function useTTS() {
  const [voices, setVoices] = useState([])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [speed, setSpeed] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightedWord, setHighlightedWord] = useState(null)
  const [currentParagraph, setCurrentParagraph] = useState(0)

  const audioRef = useRef(null)
  const timeoutsRef = useRef([])
  const paragraphsRef = useRef([])
  const currentParaRef = useRef(0)
  const isPlayingRef = useRef(false)
  const selectedVoiceRef = useRef(null)
  const speedRef = useRef(1)

  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])
  useEffect(() => { speedRef.current = speed }, [speed])

  // Load voices from backend
  useEffect(() => {
    fetch(`${API}/api/voices`)
      .then(r => r.json())
      .then(list => {
        setVoices(list)
        setSelectedVoice(list[0] ?? null)
        selectedVoiceRef.current = list[0] ?? null
      })
      .catch(() => console.warn('Could not reach TTS server'))
  }, [])

  function clearTimers() {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  function stopAudio() {
    clearTimers()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setHighlightedWord(null)
  }

  const speakParagraph = useCallback(async (paraIndex) => {
    if (paraIndex >= paragraphsRef.current.length) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setHighlightedWord(null)
      return
    }

    const text = paragraphsRef.current[paraIndex]
    if (!text?.trim()) {
      // Skip empty paragraphs
      const next = paraIndex + 1
      currentParaRef.current = next
      setCurrentParagraph(next)
      speakParagraph(next)
      return
    }

    stopAudio()
    setIsLoading(true)

    try {
      const res = await fetch(`${API}/api/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: selectedVoiceRef.current?.name ?? 'en-US-AriaNeural',
          speed: speedRef.current,
        }),
      })

      if (!res.ok) throw new Error('Synthesis failed')
      const { audioBase64, wordTimings } = await res.json()

      // If we were stopped while fetching, bail out
      if (!isPlayingRef.current) return

      setIsLoading(false)

      // Create audio element from base64
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
      audioRef.current = audio

      // Schedule word highlights
      wordTimings.forEach((timing, wi) => {
        const t = setTimeout(() => {
          setHighlightedWord({ paragraphIndex: paraIndex, wordIndex: wi })
        }, timing.offsetMs)
        timeoutsRef.current.push(t)
      })

      audio.onended = () => {
        if (!isPlayingRef.current) return
        clearTimers()
        setHighlightedWord(null)
        const next = paraIndex + 1
        currentParaRef.current = next
        setCurrentParagraph(next)
        speakParagraph(next)
      }

      audio.onerror = () => {
        setIsPlaying(false)
        isPlayingRef.current = false
        setIsLoading(false)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsLoading(false)
      setIsPlaying(false)
      isPlayingRef.current = false
    }
  }, [])

  const play = useCallback((paragraphs, fromParagraph = 0) => {
    paragraphsRef.current = paragraphs
    currentParaRef.current = fromParagraph
    isPlayingRef.current = true
    setCurrentParagraph(fromParagraph)
    setIsPlaying(true)
    speakParagraph(fromParagraph)
  }, [speakParagraph])

  const pause = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    clearTimers()
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    isPlayingRef.current = true
    setIsPlaying(true)
    if (audioRef.current?.paused) {
      // Resume existing audio — re-schedule remaining highlights from current time
      audioRef.current.play()
    } else {
      // Re-synthesize from current paragraph
      speakParagraph(currentParaRef.current)
    }
  }, [speakParagraph])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setIsLoading(false)
    stopAudio()
  }, [])

  const skipForward = useCallback(() => {
    const next = Math.min(currentParaRef.current + 1, paragraphsRef.current.length - 1)
    currentParaRef.current = next
    setCurrentParagraph(next)
    if (isPlayingRef.current) speakParagraph(next)
    else stopAudio()
  }, [speakParagraph])

  const skipBack = useCallback(() => {
    const prev = Math.max(0, currentParaRef.current - 1)
    currentParaRef.current = prev
    setCurrentParagraph(prev)
    if (isPlayingRef.current) speakParagraph(prev)
    else stopAudio()
  }, [speakParagraph])

  const jumpTo = useCallback((paraIndex) => {
    currentParaRef.current = paraIndex
    setCurrentParagraph(paraIndex)
    if (isPlayingRef.current) speakParagraph(paraIndex)
    else stopAudio()
  }, [speakParagraph])

  const changeVoice = useCallback((voice) => {
    setSelectedVoice(voice)
    selectedVoiceRef.current = voice
    if (isPlayingRef.current) speakParagraph(currentParaRef.current)
  }, [speakParagraph])

  const changeSpeed = useCallback((s) => {
    setSpeed(s)
    speedRef.current = s
    if (isPlayingRef.current) speakParagraph(currentParaRef.current)
  }, [speakParagraph])

  return {
    voices,
    selectedVoice,
    setSelectedVoice: changeVoice,
    speed,
    setSpeed: changeSpeed,
    isPlaying,
    isLoading,
    highlightedWord,
    currentParagraph,
    play,
    pause,
    resume,
    stop,
    skipForward,
    skipBack,
    jumpTo,
  }
}
