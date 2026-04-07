import { useState, useRef } from 'react'
import './DropZone.css'

export default function DropZone({ onFile, loading, error }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') onFile(file)
  }

  function handleChange(e) {
    const file = e.target.files[0]
    if (file) onFile(file)
  }

  return (
    <div className="dropzone-page">
      <div className="dropzone-brand">
        <span className="dropzone-icon">📖</span>
        <h1>Book Reader</h1>
        <p>AI-powered text-to-speech with word highlighting</p>
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf" onChange={handleChange} hidden />
        {loading ? (
          <>
            <div className="dropzone-spinner" />
            <p>Extracting text from PDF...</p>
          </>
        ) : (
          <>
            <span className="dropzone-upload-icon">📄</span>
            <p className="dropzone-main-text">Drop a PDF here</p>
            <p className="dropzone-sub-text">or click to browse</p>
          </>
        )}
      </div>

      {error && <div className="dropzone-error">⚠ {error}</div>}

      <div className="dropzone-tips">
        <h3>For the most natural voices:</h3>
        <ul>
          <li>🟦 Use <strong>Microsoft Edge</strong> — it has Neural TTS voices (Aria, Guy, Jenny)</li>
          <li>🟡 Chrome works but voices are less natural</li>
        </ul>
      </div>
    </div>
  )
}
