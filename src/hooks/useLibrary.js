import { useState, useEffect, useCallback } from 'react'
import { extractBook } from '../utils/extractBook'

const DB_NAME = 'BookReaderDB'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('bookMeta')) db.createObjectStore('bookMeta', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('bookContent')) db.createObjectStore('bookContent', { keyPath: 'id' })
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

function idbOp(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    tx.onerror = () => reject(tx.error)
    resolve(fn(tx))
  })
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbGetAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbPut(db, store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const req = tx.objectStore(store).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export function useLibrary() {
  const [books, setBooks] = useState([])   // array of bookMeta
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [db, setDb] = useState(null)

  useEffect(() => {
    openDB().then(database => {
      setDb(database)
      return idbGetAll(database, 'bookMeta')
    }).then(metas => {
      setBooks(metas.sort((a, b) => new Date(b.lastReadAt || b.addedAt) - new Date(a.lastReadAt || a.addedAt)))
    }).catch(err => console.error('IndexedDB init error:', err))
  }, [])

  const addBook = useCallback(async (file) => {
    if (!db) return
    setLoading(true)
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const renderBuffer = arrayBuffer.slice(0)
      const data = await extractBook(arrayBuffer, file.name.replace(/\.pdf$/i, ''))

      const id = `book_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const now = new Date().toISOString()

      const meta = {
        id,
        title: data.title,
        pageCount: data.pageCount,
        paragraphCount: data.paragraphs.length,
        chapterCount: data.chapters.length,
        thumbnail: data.thumbnail,
        lastParagraph: 0,
        addedAt: now,
        lastReadAt: null,
        totalReadingMs: 0,
      }

      const content = {
        id,
        paragraphs: data.paragraphs,
        paragraphPages: data.paragraphPages,
        pageStarts: data.pageStarts,
        chapters: data.chapters,
        renderBuffer,
      }

      await idbPut(db, 'bookMeta', meta)
      await idbPut(db, 'bookContent', content)

      setBooks(prev => [meta, ...prev])
      return { ...meta, ...content }
    } catch (err) {
      setError(err.message || 'Failed to add book.')
      return null
    } finally {
      setLoading(false)
    }
  }, [db])

  const openBook = useCallback(async (id) => {
    if (!db) return null
    const [meta, content] = await Promise.all([
      idbGet(db, 'bookMeta', id),
      idbGet(db, 'bookContent', id),
    ])
    if (!meta || !content) return null
    return { ...meta, ...content }
  }, [db])

  const saveProgress = useCallback(async (id, lastParagraph, addedMs = 0) => {
    if (!db) return
    const meta = await idbGet(db, 'bookMeta', id)
    if (!meta) return
    const updated = {
      ...meta,
      lastParagraph,
      lastReadAt: new Date().toISOString(),
      totalReadingMs: (meta.totalReadingMs || 0) + addedMs,
    }
    await idbPut(db, 'bookMeta', updated)
    setBooks(prev => prev.map(b => b.id === id ? updated : b))
  }, [db])

  const deleteBook = useCallback(async (id) => {
    if (!db) return
    await Promise.all([
      idbDelete(db, 'bookMeta', id),
      idbDelete(db, 'bookContent', id),
    ])
    setBooks(prev => prev.filter(b => b.id !== id))
  }, [db])

  return { books, loading, error, addBook, openBook, saveProgress, deleteBook }
}
