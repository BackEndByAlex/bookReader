import { useState, useRef, useCallback, useEffect } from 'react'

const API = ''

async function fetchAudio(text, voice, speed) {
  const res = await fetch(`${API}/api/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: voice?.name ?? 'en-US-AriaNeural', speed }),
  })
  if (!res.ok) throw new Error('Synthesis failed')
  return res.json()
}

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
  const sessionRef = useRef(0)          // incremented on every new play intent
  const prefetchCache = useRef({})

  useEffect(() => { selectedVoiceRef.current = selectedVoice }, [selectedVoice])
  useEffect(() => { speedRef.current = speed }, [speed])

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

  function clearCache() {
    prefetchCache.current = {}
  }

  // Stop current audio and detach handlers so ghost callbacks can't fire
  function stopAudio() {
    clearTimers()
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setHighlightedWord(null)
  }

  function prefetch(paraIndex) {
    const paragraphs = paragraphsRef.current
    if (paraIndex < 0 || paraIndex >= paragraphs.length || prefetchCache.current[paraIndex]) return
    const text = paragraphs[paraIndex]
    if (!text?.trim()) return
    prefetchCache.current[paraIndex] = fetchAudio(text, selectedVoiceRef.current, speedRef.current)
  }

  const speakParagraph = useCallback(async (paraIndex) => {
    // Claim this session — any older async call will see a different ID and bail
    const session = ++sessionRef.current

    if (paraIndex >= paragraphsRef.current.length) {
      setIsPlaying(false)
      isPlayingRef.current = false
      setHighlightedWord(null)
      return
    }

    const text = paragraphsRef.current[paraIndex]
    if (!text?.trim()) {
      if (session !== sessionRef.current) return
      const next = paraIndex + 1
      currentParaRef.current = next
      setCurrentParagraph(next)
      speakParagraph(next)
      return
    }

    stopAudio()
    prefetch(paraIndex)
    prefetch(paraIndex + 1)

    if (!prefetchCache.current[paraIndex]) setIsLoading(true)

    try {
      const { audioBase64, wordTimings } = await prefetchCache.current[paraIndex]

      // Bail if a newer session has taken over
      if (session !== sessionRef.current) return

      setIsLoading(false)

      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
      audioRef.current = audio

      wordTimings.forEach((timing, wi) => {
        const t = setTimeout(() => {
          if (session !== sessionRef.current) return
          setHighlightedWord({ paragraphIndex: paraIndex, wordIndex: wi })
        }, timing.offsetMs)
        timeoutsRef.current.push(t)
      })

      audio.onended = () => {
        // Only advance if this session is still current
        if (session !== sessionRef.current) return
        clearTimers()
        setHighlightedWord(null)
        const next = paraIndex + 1
        currentParaRef.current = next
        setCurrentParagraph(next)
        delete prefetchCache.current[paraIndex]
        speakParagraph(next)
      }

      audio.onerror = () => {
        if (session !== sessionRef.current) return
        setIsPlaying(false)
        isPlayingRef.current = false
        setIsLoading(false)
      }

      await audio.play()
    } catch (err) {
      if (session !== sessionRef.current) return
      console.error('TTS error:', err)
      setIsLoading(false)
      setIsPlaying(false)
      isPlayingRef.current = false
      delete prefetchCache.current[paraIndex]
    }
  }, [])

  const play = useCallback((paragraphs, fromParagraph = 0) => {
    clearCache()
    paragraphsRef.current = paragraphs
    currentParaRef.current = fromParagraph
    isPlayingRef.current = true
    setCurrentParagraph(fromParagraph)
    setIsPlaying(true)
    speakParagraph(fromParagraph)
  }, [speakParagraph])

  const pause = useCallback(() => {
    sessionRef.current++ // invalidate any in-flight speak
    isPlayingRef.current = false
    setIsPlaying(false)
    clearTimers()
    if (audioRef.current) audioRef.current.pause()
  }, [])

  const resume = useCallback(() => {
    isPlayingRef.current = true
    setIsPlaying(true)
    if (audioRef.current?.paused && audioRef.current.src) {
      // Resume the paused audio directly — no re-fetch needed
      sessionRef.current++ // own this session
      const session = sessionRef.current
      const paraIndex = currentParaRef.current
      audioRef.current.onended = () => {
        if (session !== sessionRef.current) return
        clearTimers()
        setHighlightedWord(null)
        const next = paraIndex + 1
        currentParaRef.current = next
        setCurrentParagraph(next)
        delete prefetchCache.current[paraIndex]
        speakParagraph(next)
      }
      audioRef.current.play()
    } else {
      speakParagraph(currentParaRef.current)
    }
  }, [speakParagraph])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setIsLoading(false)
    clearCache()
    stopAudio()
    // Session increment happens inside stopAudio → speakParagraph chain,
    // but we increment here too to kill any in-flight fetches
    sessionRef.current++
  }, [])

  const skipForward = useCallback(() => {
    const next = Math.min(currentParaRef.current + 1, paragraphsRef.current.length - 1)
    currentParaRef.current = next
    setCurrentParagraph(next)
    clearCache()
    if (isPlayingRef.current) speakParagraph(next)
    else stopAudio()
  }, [speakParagraph])

  const skipBack = useCallback(() => {
    const prev = Math.max(0, currentParaRef.current - 1)
    currentParaRef.current = prev
    setCurrentParagraph(prev)
    clearCache()
    if (isPlayingRef.current) speakParagraph(prev)
    else stopAudio()
  }, [speakParagraph])

  const jumpTo = useCallback((paraIndex) => {
    currentParaRef.current = paraIndex
    setCurrentParagraph(paraIndex)
    clearCache()
    if (isPlayingRef.current) speakParagraph(paraIndex)
    else stopAudio()
  }, [speakParagraph])

  const changeVoice = useCallback((voice) => {
    setSelectedVoice(voice)
    selectedVoiceRef.current = voice
    clearCache()
    if (isPlayingRef.current) speakParagraph(currentParaRef.current)
  }, [speakParagraph])

  const changeSpeed = useCallback((s) => {
    setSpeed(s)
    speedRef.current = s
    clearCache()
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
