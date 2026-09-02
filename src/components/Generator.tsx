'use client'

import { useEffect, useState } from 'react'
import { generateImage } from '../api'
import { SIZE_OPTIONS, STORAGE_KEYS } from '../config'
import { STYLE_PRESETS } from '../presets'
import type { StylePreset } from '../presets'
import type { HistoryItem, SizeOption } from '../types'
import './Generator.css'

interface GeneratorProps {
  onHistoryAdd: (item: HistoryItem) => void
}

type StatusType = 'idle' | 'loading' | 'success' | 'error'

export default function Generator({ onHistoryAdd }: GeneratorProps) {
  // localStorage 仅在客户端可用，SSR 时不能初始化读取
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [prompt, setPrompt] = useState('')

  // 挂载后从本地存储恢复 API Key（SSR 安全）
  useEffect(() => {
    setApiKey(localStorage.getItem(STORAGE_KEYS.apiKey) || '')
  }, [])

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
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null)
  // 风格预设默认折叠，需要时点击展开
  const [styleOpen, setStyleOpen] = useState(false)
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

    // 内容"前后夹心"：扩散模型对 prompt 开头 token 权重最高，结尾重申可收尾强化
    // "避文字"通过 negative_prompt 通道传达（这是扩散模型真正有效的负面指令）
    const NEGATIVE_PROMPT =
      'text, letters, words, chinese characters, chinese text, hanzi, characters, writing, written, typography, calligraphy, font, typeface, watermark, signature, caption, title, subtitle, headline, banner, label, sticker, stamp, logo, sign, OCR, garbled text, misspelled, blurry, ugly, bad quality, low resolution, distorted'
    const finalPrompt = selectedStyle
      ? `${prompt.trim()}\n\n${selectedStyle.stylePrompt}\n\n画面主体必须严格为以下内容：${prompt.trim()}`
      : prompt.trim()

    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey.trim())
    setLoading(true)
    setResult(null)
    setStatus('loading')
    setStatusMsg('正在生成图片，2K 大图可能需要 10~60 秒，请耐心等待…')

    try {
      const res = await generateImage(apiKey.trim(), {
        prompt: finalPrompt,
        negativePrompt: NEGATIVE_PROMPT,
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
        prompt: finalPrompt,
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

  // 选择风格:再次点击取消选择,选中时联动切换推荐尺寸
  const handleStyleSelect = (preset: StylePreset) => {
    const isActive = selectedStyle?.id === preset.id
    setSelectedStyle(isActive ? null : preset)
    if (!isActive) setSize(preset.recommendedSize)
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
                name="apiKey"
                className="input"
                placeholder="请输入你的 Gitee AI API Key"
                autoComplete="new-password"
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

          {/* 风格预设（可选，默认折叠） */}
          <div className="form-group">
            <div
              className="style-label-row style-toggle"
              onClick={() => setStyleOpen(!styleOpen)}
            >
              <label htmlFor="style-presets">风格预设（可选）</label>
              <span className="hint">
                {styleOpen
                  ? '点击收起'
                  : selectedStyle
                    ? `已选「${selectedStyle.name}」，点击展开可更换`
                    : '不选择则直接使用你输入的提示词生成'}
                <span className="style-arrow">{styleOpen ? '▲' : '▼'}</span>
              </span>
            </div>
            {styleOpen && (
            <div className="style-presets" id="style-presets">
              {(() => {
                const order = ['微信公众号', '小红书', '通用风格']
                const groups = new Map<string, typeof STYLE_PRESETS>()
                for (const preset of STYLE_PRESETS) {
                  if (!groups.has(preset.platform)) groups.set(preset.platform, [])
                  groups.get(preset.platform)!.push(preset)
                }
                return order
                  .filter((p) => groups.has(p))
                  .map((platform) => (
                    <div key={platform} className="style-group">
                      <div className="style-group-label">{platform}</div>
                      <div className="style-group-items">
                        {groups.get(platform)!.map((preset) => {
                          const active = selectedStyle?.id === preset.id
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              className={`style-option ${active ? 'active' : ''}`}
                              onClick={() => handleStyleSelect(preset)}
                              title={preset.description}
                            >
                              <span className="style-name">{preset.name}</span>
                              <span className="style-platform">{platform}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
              })()}
            </div>
            )}
            {selectedStyle && (
              <div className="hint style-tip">
                已选择「{selectedStyle.name}」，将自动附加风格描述并切换到推荐尺寸{' '}
                {selectedStyle.recommendedSize.label}（再次点击可取消）
              </div>
            )}
          </div>

          {/* 尺寸选择 */}
          <div className="form-group">
            <label>图片尺寸</label>
            {(() => {
              // 按 group 分组渲染，保持数组原有顺序
              const groups = new Map<string, SizeOption[]>()
              for (const opt of SIZE_OPTIONS) {
                const g = opt.group || '其他'
                if (!groups.has(g)) groups.set(g, [])
                groups.get(g)!.push(opt)
              }
              return Array.from(groups.entries()).map(([group, options]) => (
                <div key={group} className="size-group">
                  <div className="size-group-label">{group}</div>
                  <div className="size-options">
                    {options.map((opt) => (
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
              ))
            })()}
            <div className="hint">公众号封面建议生成后裁剪为 2.35:1（900×383）使用。</div>
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

          {/* 生成按钮(加载中作为唯一进度指示,不再重复显示状态框) */}
          <button
            className="btn btn-primary generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                正在生成…（2K 大图约 10~60 秒）
              </>
            ) : (
              <>✨ 生成图片</>
            )}
          </button>

          {/* 状态提示(仅成功/失败时展示) */}
          {status === 'success' && (
            <div className="status status-success">{statusMsg}</div>
          )}
          {status === 'error' && (
            <div className="status status-error">{statusMsg}</div>
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