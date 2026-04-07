import express from 'express'
import cors from 'cors'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const VOICES = [
  { name: 'en-US-AriaNeural',    label: 'Aria (US Female)',        lang: 'en-US' },
  { name: 'en-US-GuyNeural',     label: 'Guy (US Male)',           lang: 'en-US' },
  { name: 'en-US-JennyNeural',   label: 'Jenny (US Female)',       lang: 'en-US' },
  { name: 'en-US-TonyNeural',    label: 'Tony (US Male)',          lang: 'en-US' },
  { name: 'en-US-DavisNeural',   label: 'Davis (US Male)',         lang: 'en-US' },
  { name: 'en-US-NancyNeural',   label: 'Nancy (US Female)',       lang: 'en-US' },
  { name: 'en-GB-SoniaNeural',   label: 'Sonia (British Female)',  lang: 'en-GB' },
  { name: 'en-GB-RyanNeural',    label: 'Ryan (British Male)',     lang: 'en-GB' },
  { name: 'en-GB-LibbyNeural',   label: 'Libby (British Female)',  lang: 'en-GB' },
  { name: 'en-AU-NatashaNeural', label: 'Natasha (AU Female)',     lang: 'en-AU' },
  { name: 'en-AU-WilliamNeural', label: 'William (AU Male)',       lang: 'en-AU' },
  { name: 'en-IE-EmilyNeural',   label: 'Emily (Irish Female)',    lang: 'en-IE' },
  { name: 'en-CA-ClaraNeural',   label: 'Clara (Canadian Female)', lang: 'en-CA' },
]

app.get('/api/voices', (_req, res) => res.json(VOICES))

app.post('/api/synthesize', async (req, res) => {
  const { text, voice = 'en-US-AriaNeural', speed = 1 } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided.' })

  try {
    const tts = new MsEdgeTTS()
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
      wordBoundaryEnabled: true,
    })

    const { audioStream, metadataStream } = tts.toStream(text, { rate: speed })

    // Collect metadata chunks as they arrive (metadataStream never emits 'end',
    // but all chunks arrive before audio ends)
    const metaChunks = []
    metadataStream?.on('data', chunk => metaChunks.push(chunk))

    // Collect audio — this stream DOES end properly
    const audioChunks = []
    await new Promise((resolve, reject) => {
      audioStream.on('data', chunk => audioChunks.push(chunk))
      audioStream.on('end', resolve)
      audioStream.on('error', reject)
    })

    // Cleanup
    metadataStream?.destroy()
    tts.close()

    const audioBase64 = Buffer.concat(audioChunks).toString('base64')

    // Parse word boundaries from metadata chunks
    const wordTimings = []
    for (const chunk of metaChunks) {
      try {
        const parsed = JSON.parse(chunk.toString())
        for (const item of parsed?.Metadata ?? []) {
          if (item.Type === 'WordBoundary') {
            wordTimings.push({
              word: item.Data.text.Text,
              offsetMs: item.Data.Offset / 10000,
              durationMs: item.Data.Duration / 10000,
            })
          }
        }
      } catch { /* skip malformed */ }
    }

    console.log(`✓ Synthesized ${wordTimings.length} words, ${Math.round(audioChunks.reduce((a, c) => a + c.length, 0) / 1024)}KB audio`)
    res.json({ audioBase64, wordTimings })

  } catch (err) {
    console.error('✗ TTS error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Serve built frontend in production
const distPath = join(__dirname, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => res.sendFile(join(distPath, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Server → http://localhost:${PORT}`))
