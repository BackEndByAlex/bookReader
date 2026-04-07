import { useState, useCallback } from 'react'

const KEY = 'bookreader_bookmarks'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] } catch { return [] }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState(load)

  const addBookmark = useCallback((bookTitle, paragraphIndex, previewText) => {
    setBookmarks(prev => {
      // Avoid duplicates at same position
      const exists = prev.some(b => b.bookTitle === bookTitle && b.paragraphIndex === paragraphIndex)
      if (exists) return prev
      const updated = [
        { id: Date.now(), bookTitle, paragraphIndex, previewText, date: new Date().toISOString() },
        ...prev,
      ]
      localStorage.setItem(KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeBookmark = useCallback((id) => {
    setBookmarks(prev => {
      const updated = prev.filter(b => b.id !== id)
      localStorage.setItem(KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const bookmarksForBook = useCallback((bookTitle) => {
    return bookmarks.filter(b => b.bookTitle === bookTitle)
  }, [bookmarks])

  return { bookmarks, addBookmark, removeBookmark, bookmarksForBook }
}
