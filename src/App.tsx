import { useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Generator from './components/Generator'
import History from './components/History'
import Tutorial from './components/Tutorial'
import Footer from './components/Footer'
import { HISTORY_LIMIT, STORAGE_KEYS } from './config'
import type { HistoryItem } from './types'

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history)
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  } catch {
    return []
  }
}

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>(loadHistory)

  const handleHistoryAdd = (item: HistoryItem) => {
    setHistory((prev) => {
      const next = [item, ...prev].slice(0, HISTORY_LIMIT)
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next))
      return next
    })
  }

  const handleHistoryClear = () => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEYS.history)
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Generator onHistoryAdd={handleHistoryAdd} />
        <History items={history} onClear={handleHistoryClear} />
        <Tutorial />
      </main>
      <Footer />
    </>
  )
}