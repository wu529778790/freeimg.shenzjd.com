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

// 支持的尺寸选项
export const SIZE_OPTIONS: SizeOption[] = [
  { label: '2K 方形', width: 2048, height: 2048, desc: '2048 × 2048' },
  { label: '2K 横版', width: 2048, height: 1152, desc: '2048 × 1152' },
  { label: '2K 竖版', width: 1152, height: 2048, desc: '1152 × 2048' },
  { label: '1K 方形', width: 1024, height: 1024, desc: '1024 × 1024' }
]

// 历史记录最大条数
export const HISTORY_LIMIT = 20