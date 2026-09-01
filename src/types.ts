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

// 提示词分类
export interface PromptCategory {
  id: number
  name: string
  slug: string
  dimension: string
}

// 提示词条目
export interface PromptItem {
  id: number
  title: string
  description: string
  content: string // 英文提示词
  translatedContent: string // 中文提示词
  slug: string
  author: string
  authorLink: string
  sourceLink: string
  sourcePublishedAt: string
  media: string
  mediaThumbnail: string
  language: string
  category: PromptCategory | null
  featured: boolean
  views: number
  likes: number
}

// 提示词数据文件结构
export interface PromptsData {
  source: string
  sourceUrl: string
  crawledAt: string
  total: number
  prompts: PromptItem[]
}