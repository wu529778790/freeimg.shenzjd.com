import { useEffect, useState } from 'react'
import type { PromptItem } from '../types'

interface PromptsData {
  prompts: PromptItem[]
  total: number
}

let cache: PromptsData | null = null
let pending: Promise<PromptsData> | null = null

/**
 * 加载提示词数据（带缓存，避免重复请求）
 * 数据文件放在 public/data/prompts.json，通过 fetch 加载
 */
export function loadPrompts(): Promise<PromptsData> {
  if (cache) return Promise.resolve(cache)
  if (pending) return pending

  pending = fetch('/data/prompts.json')
    .then((res) => {
      if (!res.ok) throw new Error(`加载提示词失败: ${res.status}`)
      return res.json()
    })
    .then((data) => {
      cache = data
      return data
    })
    .finally(() => {
      pending = null
    })

  return pending
}

/**
 * React Hook：加载提示词数据
 */
export function usePrompts() {
  const [data, setData] = useState<PromptsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    loadPrompts()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}