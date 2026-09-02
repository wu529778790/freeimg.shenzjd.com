'use client'

import { useEffect, useRef, useState } from 'react'
import { STYLE_PRESETS } from '../presets'
import type { StylePreset } from '../presets'
import type { HistoryItem } from '../types'
import {
  subscribeWxUser,
  ensureWxLogin,
  type WxUserState
} from '../utils/wxauth-client'
import './HunyuanStudio.css'

interface HunyuanStudioProps {
  onHistoryAdd: (item: HistoryItem) => void
}

type StatusType = 'idle' | 'loading' | 'success' | 'error'
type Mode = 't2i' | 'i2i'
type AssistMode = 'enhance' | 'translate' | 'condense'

// /api/ai/quota 返回的配额信息:普通用户看今日剩余,管理员看资源包总量剩余
interface QuotaInfo {
  isAdmin: boolean
  dailyLimit: number
  used: number
  remaining: number
  packageTotal: number
  packageUsed: number
  packageRemaining: number
}

// 混元文生图支持的尺寸(实测:宽高 [512,2048] 且面积 ≤ 1024x1024,1280x1280 会 400)
const HY_SIZE_OPTIONS = [
  { label: '1:1', size: '1024x1024', desc: '1024 × 1024' },
  { label: '16:9', size: '1280x720', desc: '1280 × 720 · 横版' },
  { label: '9:16', size: '720x1280', desc: '720 × 1280 · 手机壁纸' },
  { label: '4:1', size: '2048x512', desc: '2048 × 512 · 公众号封面' }
]

const PROMPT_MAX = 500

export default function HunyuanStudio({ onHistoryAdd }: HunyuanStudioProps) {
  const [mode, setMode] = useState<Mode>('t2i')
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState(HY_SIZE_OPTIONS[0].size)
  const [revise, setRevise] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null)
  const [styleOpen, setStyleOpen] = useState(false)

  // 图生图:垫图 base64(裸,不带 data URL 前缀)
  const [refImage, setRefImage] = useState<{ base64: string; dataUrl: string; name: string } | null>(null)

  // 提示词助手
  const [assistantBusy, setAssistantBusy] = useState(false)
  const [assistantText, setAssistantText] = useState('')
  const [assistantMode, setAssistantMode] = useState<AssistMode | null>(null)
  const assistantAbort = useRef<AbortController | null>(null)

  const [status, setStatus] = useState<StatusType>('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [quota, setQuota] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ dataUrl: string; ext: string } | null>(null)
  // 微信登录态:登录在导航栏头像处完成(全站共享),这里只订阅用于展示与拦截
  const [wxUser, setWxUser] = useState<WxUserState | null>(null)

  useEffect(() => subscribeWxUser(setWxUser), [])

  // 拉取配额:登录后展示今日剩余(普通用户)/资源包总量剩余(管理员),生成后刷新
  const refreshQuota = async () => {
    try {
      const resp = await fetch('/api/ai/quota')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.success) setQuota(data as QuotaInfo)
    } catch {
      // 配额服务不可用时静默隐藏额度提示
    }
  }

  useEffect(() => {
    if (wxUser) refreshQuota()
    else setQuota(null)
  }, [wxUser])

  // 确保已登录:未登录则弹出微信登录弹窗(小程序扫码/公众号验证码)
  const ensureLogin = async (): Promise<boolean> => {
    if (wxUser) return true
    const ok = await ensureWxLogin()
    if (!ok) {
      setStatus('error')
      setStatusMsg('需要微信登录后才能生成图片')
      return false
    }
    return true
  }

  // 从提示词库/热门提示词跳转过来时,读取待填入的提示词
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_prompt')
    if (pending) {
      setPrompt(pending)
      sessionStorage.removeItem('pending_prompt')
    }
  }, [])

  const finalPrompt = selectedStyle
    ? `${prompt.trim()}\n\n${selectedStyle.stylePrompt}`
    : prompt.trim()

  // 选择风格:再次点击取消选择
  const handleStyleSelect = (preset: StylePreset) => {
    const isActive = selectedStyle?.id === preset.id
    setSelectedStyle(isActive ? null : preset)
  }

  // 垫图文件读取:上传选择与 Ctrl+V 粘贴共用
  const loadRefFile = (file: File) => {
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setStatus('error')
      setStatusMsg('参考图仅支持 JPG / PNG 格式')
      return
    }
    if (file.size > 7.5 * 1024 * 1024) {
      setStatus('error')
      setStatusMsg('参考图最大 10MB，当前文件过大')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setRefImage({
        base64: dataUrl.split(',')[1] || '',
        dataUrl,
        name: file.name || '剪贴板图片'
      })
      setMode('i2i')
    }
    reader.readAsDataURL(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (file) loadRefFile(file)
  }

  // 全局粘贴:剪贴板里有图片时直接作为垫图(不影响正常的文本粘贴)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (/^image\/(png|jpe?g)$/.test(item.type)) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            loadRefFile(file)
          }
          return
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // 调用 /api/ai/polish 并流式写入助手输出框,返回完整文本
  const streamPolish = async (text: string, m: AssistMode, signal: AbortSignal): Promise<string> => {
    const resp = await fetch('/api/ai/polish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: text, mode: m }),
      signal
    })
    if (!resp.ok || !resp.body) {
      const data = await resp.json().catch(() => null)
      throw new Error(data?.message || `助手请求失败(${resp.status})`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let out = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
      setAssistantText(out)
    }
    return out
  }

  // 提示词助手按钮:润色扩写 / 翻译成英文
  const handlePolish = async (assistMode: 'enhance' | 'translate') => {
    if (!prompt.trim()) {
      setStatus('error')
      setStatusMsg('请先输入提示词，再让助手润色')
      return
    }
    if (assistantBusy) {
      assistantAbort.current?.abort()
      return
    }
    setAssistantBusy(true)
    setAssistantMode(assistMode)
    setAssistantText('')
    const controller = new AbortController()
    assistantAbort.current = controller
    try {
      await streamPolish(prompt.trim(), assistMode, controller.signal)
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStatus('error')
        setStatusMsg(err instanceof Error ? err.message : String(err))
      }
    } finally {
      setAssistantBusy(false)
      assistantAbort.current = null
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setStatus('error')
      setStatusMsg('请先填写提示词')
      return
    }
    if (mode === 'i2i' && !refImage) {
      setStatus('error')
      setStatusMsg('图生图模式请先上传参考图')
      return
    }
    // 未登录则弹出微信登录弹窗,登录完成后再继续
    if (!(await ensureLogin())) return

    setLoading(true)
    setResult(null)
    setStatus('loading')
    setStatusMsg('混元生成中，通常需要 10~40 秒，请耐心等待…')

    try {
      // 提示词超过模型 500 字上限时,先自动用混元精简再生成
      let effectivePrompt = finalPrompt
      if (effectivePrompt.length > PROMPT_MAX) {
        setStatusMsg(`提示词 ${effectivePrompt.length} 字超出 500 上限，正在 AI 自动精简…`)
        const controller = new AbortController()
        assistantAbort.current = controller
        setAssistantBusy(true)
        setAssistantMode('condense')
        setAssistantText('')
        try {
          const condensed = (await streamPolish(effectivePrompt, 'condense', controller.signal)).trim()
          if (!condensed) throw new Error('自动精简失败，请手动缩短提示词后重试')
          effectivePrompt = condensed
        } catch (err) {
          if ((err as Error).name === 'AbortError') throw new Error('已取消')
          throw err
        } finally {
          setAssistantBusy(false)
          assistantAbort.current = null
        }
      }

      const endpoint = mode === 't2i' ? '/api/ai/t2i' : '/api/ai/i2i'
      const body =
        mode === 't2i'
          ? { prompt: effectivePrompt, size, revise }
          : { prompt: effectivePrompt, imageBase64: refImage!.base64 }
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      // 登录态失效(取关/Cookie 过期):重新弹登录,提示用户再点一次生成
      if (resp.status === 401 && data.needAuth) {
        setWxUser(null)
        await ensureWxLogin()
        throw new Error('登录已失效，请重新登录后再生成')
      }
      if (!resp.ok || !data.success) {
        throw new Error(data.message || `生成失败(${resp.status})`)
      }

      setResult({ dataUrl: data.dataUrl, ext: 'png' })
      setStatus('success')
      setStatusMsg('图片生成成功！')
      refreshQuota()

      onHistoryAdd({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        dataUrl: data.dataUrl,
        ext: 'png',
        prompt: effectivePrompt,
        sizeLabel: mode === 't2i' ? size.replace('x', ' × ') : '图生图',
        createdAt: Date.now(),
        provider: 'hunyuan'
      })
    } catch (err) {
      console.error(err)
      setStatus('error')
      setStatusMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const a = document.createElement('a')
    a.href = result.dataUrl
    a.download = `hunyuan-${Date.now()}.${result.ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleUseAssistant = () => {
    if (assistantText.trim()) {
      setPrompt(assistantText.trim())
      setAssistantText('')
      setAssistantMode(null)
    }
  }

  return (
    <section className="hunyuan-studio" id="generator">
      <div className="container">
        <div className="hunyuan-card">
          {/* 模式切换 */}
          <div className="hy-mode-tabs">
            <button
              className={`hy-mode-tab ${mode === 't2i' ? 'active' : ''}`}
              onClick={() => setMode('t2i')}
            >
              ✍️ 文生图
            </button>
            <button
              className={`hy-mode-tab ${mode === 'i2i' ? 'active' : ''}`}
              onClick={() => setMode('i2i')}
            >
              🖼️ 图生图
            </button>
            {quota && (
              <span
                className="hy-quota-hint"
                title={quota.isAdmin ? '混元资源包总量剩余（仅管理员可见）' : '每人每天免费额度，次日刷新'}
              >
                {quota.isAdmin
                  ? `📦 资源包剩余 ${quota.packageRemaining.toLocaleString()} / ${quota.packageTotal.toLocaleString()} 张`
                  : `今日剩余 ${quota.remaining} / ${quota.dailyLimit} 张`}
              </span>
            )}
          </div>

          {/* 提示词 */}
          <div className="hy-form-group">
            <label htmlFor="hy-prompt">
              提示词（Prompt）
              <span className={`hy-count ${prompt.length > PROMPT_MAX ? 'over' : ''}`}>
                {prompt.length} / {PROMPT_MAX}
              </span>
            </label>
            <textarea
              id="hy-prompt"
              className="hy-textarea"
              placeholder="描述你想要的画面，如：一只橘色的猫趴在窗台上晒太阳，温暖阳光，摄影风格…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>

            {/* 提示词助手 */}
            <div className="hy-assistant-bar">
              <button
                className="btn hy-assist-btn"
                onClick={() => handlePolish('enhance')}
                disabled={assistantBusy}
              >
                {assistantBusy && assistantMode === 'enhance' ? '润色中…' : '✨ AI 润色扩写'}
              </button>
              <button
                className="btn hy-assist-btn"
                onClick={() => handlePolish('translate')}
                disabled={assistantBusy}
              >
                {assistantBusy && assistantMode === 'translate' ? '翻译中…' : '🌐 翻译成英文'}
              </button>
              <span className="hy-assist-hint">由混元大模型驱动，流式生成</span>
            </div>
            {(assistantText || assistantBusy) && (
              <div className="hy-assistant-output">
                <div className="hy-assistant-text">
                  {assistantText || '正在思考…'}
                  {assistantBusy && <span className="hy-caret">▍</span>}
                </div>
                {!assistantBusy && (
                  <div className="hy-assistant-actions">
                    <button className="btn hy-assist-btn" onClick={handleUseAssistant}>
                      ✓ 采用此结果
                    </button>
                    <button
                      className="btn hy-assist-btn"
                      onClick={() => {
                        setAssistantText('')
                        setAssistantMode(null)
                      }}
                    >
                      ✕ 放弃
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 图生图:垫图上传 */}
          {mode === 'i2i' && (
            <div className="hy-form-group">
              <label>参考图（1 张，JPG / PNG，≤10MB）</label>
              {refImage ? (
                <div className="hy-ref-preview">
                  <img src={refImage.dataUrl} alt="参考图预览" />
                  <div className="hy-ref-info">
                    <span className="hy-ref-name">{refImage.name}</span>
                    <button className="btn hy-assist-btn" onClick={() => setRefImage(null)}>
                      ✕ 移除
                    </button>
                  </div>
                </div>
              ) : (
                <label className="hy-upload-zone">
                  <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} />
                  <span className="hy-upload-icon">📁</span>
                  <span>点击选择图片，或直接 Ctrl+V 粘贴截图</span>
                </label>
              )}
              <div className="hy-hint">生成结果会参考这张图的构图与内容，配合提示词描述想要的变化。</div>
            </div>
          )}

          {/* 风格预设(可选,默认折叠) */}
          <div className="hy-form-group">
            <div className="hy-style-toggle" onClick={() => setStyleOpen(!styleOpen)}>
              <label>风格预设（可选）</label>
              <span className="hy-hint">
                {styleOpen
                  ? '点击收起'
                  : selectedStyle
                    ? `已选「${selectedStyle.name}」，点击展开可更换`
                    : '不选择则直接使用你输入的提示词生成'}
                <span className="hy-arrow">{styleOpen ? '▲' : '▼'}</span>
              </span>
            </div>
            {styleOpen && (
              <div className="hy-style-presets">
                {STYLE_PRESETS.map((preset) => {
                  const active = selectedStyle?.id === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`hy-style-option ${active ? 'active' : ''}`}
                      onClick={() => handleStyleSelect(preset)}
                      title={preset.description}
                    >
                      <span className="hy-style-name">{preset.name}</span>
                      <span className="hy-style-platform">{preset.platform}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 尺寸选择(仅文生图) */}
          {mode === 't2i' && (
            <div className="hy-form-group">
              <label>图片尺寸</label>
              <div className="hy-size-options">
                {HY_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.size}
                    className={`hy-size-option ${size === opt.size ? 'active' : ''}`}
                    onClick={() => setSize(opt.size)}
                  >
                    <span className="hy-size-label">{opt.label}</span>
                    <span className="hy-size-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 智能改写开关(仅文生图) */}
          {mode === 't2i' && (
            <div className="hy-form-group">
              <label className="hy-checkbox-row">
                <input
                  type="checkbox"
                  checked={revise}
                  onChange={(e) => setRevise(e.target.checked)}
                />
                开启智能改写（模型自动优化提示词，效果更稳，但多花约 10 秒）
              </label>
            </div>
          )}

          {/* 生成按钮(加载中作为唯一进度指示:精简阶段与生成阶段文案不同) */}
          <button className="btn btn-primary hy-generate-btn" onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <span className="hy-spinner"></span>
                {loading && assistantBusy && assistantMode === 'condense'
                  ? '正在精简提示词…'
                  : '正在生成…（约 10~40 秒）'}
              </>
            ) : (
              <>✨ 立即生成</>
            )}
          </button>

          {/* 状态提示(仅成功/失败时展示) */}
          {status === 'success' && (
            <div className="hy-status hy-status-success">{statusMsg}</div>
          )}
          {status === 'error' && (
            <div className="hy-status hy-status-error">{statusMsg}</div>
          )}

          {/* 结果展示 */}
          {result && (
            <div className="hy-result">
              <div className="hy-result-img-wrap">
                <img src={result.dataUrl} alt="生成的图片" />
              </div>
              <button className="btn btn-success hy-download-btn" onClick={handleDownload}>
                ⬇ 下载图片
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
