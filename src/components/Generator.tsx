import { useEffect, useState } from 'react'
import { generateImage } from '../api'
import { SIZE_OPTIONS, STORAGE_KEYS } from '../config'
import type { HistoryItem, SizeOption } from '../types'
import './Generator.css'

interface GeneratorProps {
  onHistoryAdd: (item: HistoryItem) => void
}

type StatusType = 'idle' | 'loading' | 'success' | 'error'

export default function Generator({ onHistoryAdd }: GeneratorProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEYS.apiKey) || '')
  const [showKey, setShowKey] = useState(false)
  const [prompt, setPrompt] = useState('')

  // 从提示词库跳转过来时，读取待填入的提示词
  useEffect(() => {
    const applyPendingPrompt = () => {
      const pending = sessionStorage.getItem('pending_prompt')
      if (pending) {
        setPrompt(pending)
        sessionStorage.removeItem('pending_prompt')
        // 滚动到生成区域
        setTimeout(() => {
          document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }

    // 挂载时读取一次（从提示词库跳转过来）
    applyPendingPrompt()

    // 监听自定义事件（首页热门提示词点击时触发）
    window.addEventListener('use-prompt', applyPendingPrompt)
    return () => window.removeEventListener('use-prompt', applyPendingPrompt)
  }, [])
  const [size, setSize] = useState<SizeOption>(SIZE_OPTIONS[0])
  const [steps, setSteps] = useState(9)
  const [status, setStatus] = useState<StatusType>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [result, setResult] = useState<{ dataUrl: string; ext: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setStatus('error')
      setStatusMsg('请先填写 API Key')
      return
    }
    if (!prompt.trim()) {
      setStatus('error')
      setStatusMsg('请先填写提示词')
      return
    }

    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey.trim())
    setLoading(true)
    setResult(null)
    setStatus('loading')
    setStatusMsg('正在生成图片，2K 大图可能需要 10~60 秒，请耐心等待…')

    try {
      const res = await generateImage(apiKey.trim(), {
        prompt: prompt.trim(),
        size,
        steps
      })
      setResult(res)
      setStatus('success')
      setStatusMsg('图片生成成功！')

      onHistoryAdd({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        dataUrl: res.dataUrl,
        ext: res.ext,
        prompt: prompt.trim(),
        sizeLabel: `${size.width} × ${size.height}`,
        createdAt: Date.now()
      })
    } catch (err) {
      console.error(err)
      let msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg += '（可能是网络或跨域问题，请检查网络连接）'
      }
      setStatus('error')
      setStatusMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.dataUrl
    a.download = `z-image-${Date.now()}.${result.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <section className="generator" id="generator">
      <div className="container">
        <div className="section-header">
          <h2>在线生成</h2>
          <p>输入提示词，一键生成你的专属图片</p>
        </div>

        <div className="generator-card">
          {/* API Key */}
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <div className="key-input-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                id="apiKey"
                className="input"
                placeholder="请输入你的 Gitee AI API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button
                className="key-toggle"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? '隐藏' : '显示'}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="hint">
              Key 仅保存在本浏览器 localStorage 中，不会上传到别处（会直接发送给 ai.gitee.com 用于生成）。
              还没有 Key？<a href="#tutorial">查看获取教程 →</a>
            </div>
          </div>

          {/* 提示词 */}
          <div className="form-group">
            <label htmlFor="prompt">提示词（Prompt）</label>
            <textarea
              id="prompt"
              className="input textarea"
              placeholder="请输入图片描述，越详细效果越好…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
          </div>

          {/* 尺寸选择 */}
          <div className="form-group">
            <label>图片尺寸</label>
            <div className="size-options">
              {SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  className={`size-option ${size.label === opt.label ? 'active' : ''}`}
                  onClick={() => setSize(opt)}
                >
                  <span className="size-label">{opt.label}</span>
                  <span className="size-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 步数调节 */}
          <div className="form-group">
            <label>
              生成步数：<span className="steps-value">{steps}</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={steps}
              onChange={(e) => setSteps(Number(e.target.value))}
              className="range-input"
            />
            <div className="hint">步数越高细节越丰富，但生成时间越长。推荐 9。</div>
          </div>

          {/* 生成按钮 */}
          <button
            className="btn btn-primary generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                正在生成…
              </>
            ) : (
              <>✨ 生成图片</>
            )}
          </button>

          {/* 状态提示 */}
          {status !== 'idle' && (
            <div className={`status status-${status}`}>
              {status === 'loading' && <span className="spinner"></span>}
              {statusMsg}
            </div>
          )}

          {/* 结果展示 */}
          {result && (
            <div className="result">
              <div className="result-img-wrap">
                <img src={result.dataUrl} alt="生成的图片" />
              </div>
              <button className="btn btn-success download-btn" onClick={handleDownload}>
                ⬇ 下载图片
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}