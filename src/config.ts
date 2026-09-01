import type { SizeOption } from './types'

// Gitee AI 接口地址
export const API_URL = 'https://ai.gitee.com/v1/images/generations'

// 模型名称
export const MODEL = 'z-image-turbo'

// localStorage 存储 key
export const STORAGE_KEYS = {
  apiKey: 'gitee_ai_api_key',
  history: 'z_image_turbo_history'
}

// 支持的尺寸选项（Gitee AI z-image-turbo 实际支持的 Fixed size 列表，自定义尺寸需为 8 的倍数）
export const SIZE_OPTIONS: SizeOption[] = [
  { label: '1:1', width: 2048, height: 2048, desc: '2048 × 2048', group: '基础' },
  { label: '4:3', width: 2048, height: 1536, desc: '2048 × 1536', group: '基础' },
  { label: '3:4', width: 1536, height: 2048, desc: '1536 × 2048 · 小红书', group: '基础' },
  { label: '3:2', width: 2048, height: 1360, desc: '2048 × 1360', group: '基础' },
  { label: '2:3', width: 1360, height: 2048, desc: '1360 × 2048 · 小红书长图', group: '基础' },
  { label: '16:9', width: 2048, height: 1152, desc: '2048 × 1152', group: '基础' },
  { label: '9:16', width: 1152, height: 2048, desc: '1152 × 2048', group: '基础' }
]

// 历史记录最大条数
export const HISTORY_LIMIT = 20