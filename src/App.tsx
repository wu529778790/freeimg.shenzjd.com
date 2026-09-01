import { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Features from './components/Features'
import Generator from './components/Generator'
import HotPrompts from './components/HotPrompts'
import History from './components/History'
import Tutorial from './components/Tutorial'
import Footer from './components/Footer'
import { HISTORY_LIMIT } from './config'
import { addHistory, clearHistory, loadHistory, removeHistory } from './utils/historyDB'
import type { HistoryItem } from './types'

export default function App() {
  const [history, setHistory] = useState<HistoryItem[]>([])

  // 组件挂载后从 IndexedDB 异步加载历史记录
  useEffect(() => {
    let cancelled = false
    loadHistory().then((items) => {
      if (!cancelled) setHistory(items)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleHistoryAdd = async (item: HistoryItem) => {
    // 先更新内存状态（最新在前）
    setHistory((prev) => [item, ...prev].slice(0, HISTORY_LIMIT))
    // 写入 IndexedDB
    await addHistory(item)
    // 若超出条数上限，删除最旧的记录
    const all = await loadHistory()
    if (all.length > HISTORY_LIMIT) {
      const toRemove = all.slice(HISTORY_LIMIT)
      for (const old of toRemove) {
        await removeHistory(old.id)
      }
    }
  }

  const handleHistoryClear = async () => {
    setHistory([])
    await clearHistory()
  }

  // 使用提示词：写入 sessionStorage 并触发事件让 Generator 读取
  const handleUsePrompt = (prompt: string) => {
    sessionStorage.setItem('pending_prompt', prompt)
    window.dispatchEvent(new Event('use-prompt'))
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Generator onHistoryAdd={handleHistoryAdd} />
        <HotPrompts onUsePrompt={handleUsePrompt} />
        <History items={history} onClear={handleHistoryClear} />
        <Tutorial />
      </main>
      <Footer />
    </>
  )
}