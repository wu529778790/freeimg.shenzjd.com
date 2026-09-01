// 图片尺寸选项
export interface SizeOption {
  label: string
  width: number
  height: number
  desc: string
}

// 生成请求参数
export interface GenerateParams {
  prompt: string
  size: SizeOption
  steps: number
}

// 生成结果
export interface GenerateResult {
  dataUrl: string
  ext: string
  prompt: string
  size: SizeOption
  createdAt: number
}

// 历史记录项
export interface HistoryItem {
  id: string
  dataUrl: string
  ext: string
  prompt: string
  sizeLabel: string
  createdAt: number
}