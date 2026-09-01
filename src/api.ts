import { API_URL, MODEL } from './config'
import type { GenerateParams } from './types'

interface GenerateResponse {
  data?: Array<{
    b64_json?: string
    url?: string
  }>
}

/**
 * 调用 Gitee AI 生成图片
 * @param apiKey API Key
 * @param params 生成参数
 * @returns 返回 dataUrl 和文件扩展名
 */
export async function generateImage(
  apiKey: string,
  params: GenerateParams
): Promise<{ dataUrl: string; ext: string }> {
  const { prompt, size, steps } = params

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
      'X-Failover-Enabled': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      width: size.width,
      height: size.height,
      num_inference_steps: steps
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errText}`)
  }

  const data: GenerateResponse = await response.json()

  if (!data.data || data.data.length === 0) {
    throw new Error('接口未返回图片数据')
  }

  const imageData = data.data[0]

  if (imageData.b64_json) {
    return {
      dataUrl: 'data:image/png;base64,' + imageData.b64_json,
      ext: 'png'
    }
  }

  if (imageData.url) {
    const imgResp = await fetch(imageData.url)
    if (!imgResp.ok) throw new Error('图片下载失败：' + imgResp.status)
    const blob = await imgResp.blob()
    const ext = (imageData.url.split('.').pop()?.split('?')[0] || 'png').toLowerCase()
    return { dataUrl: URL.createObjectURL(blob), ext }
  }

  throw new Error('返回数据中既没有 url 也没有 b64_json')
}