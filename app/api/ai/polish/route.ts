import { NextRequest, NextResponse } from 'next/server'
import { getChatModel, HY_CHAT_MODEL } from '@/lib/tcb'

/**
 * POST /api/ai/polish  提示词助手(混元 hy3 流式输出)
 * body: { prompt: string, mode?: 'enhance' | 'translate' | 'condense' }
 * 返回: text/plain 流式文本(不走 SSE,前端按纯文本增量读取即可)
 */

const PROMPT_MAX = 500

const SYSTEM_PROMPTS: Record<string, string> = {
  // 扩写润色:把简单描述扩写成细节丰富的生图提示词
  enhance:
    '你是专业的 AI 绘画提示词优化师。用户会给你一段简单的画面描述，请你把它扩写润色成一段细节丰富的图像生成提示词：补充主体细节、环境氛围、光线、构图、画质风格等要素，保持用户的原始意图和主体不变。直接输出优化后的提示词正文，不要任何解释、前缀、引号或列表。中文输出，不超过 450 字。',
  // 翻译:输出英文提示词(部分生图模型对英文理解更好)
  translate:
    '你是专业的 AI 绘画提示词翻译师。把用户给出的中文画面描述翻译成地道的英文图像生成提示词，可以适当补充利于生图的风格与画质关键词（如 high detail, soft lighting），但不得改变画面主体。直接输出英文提示词正文，不要任何解释、前缀或引号，不超过 450 字。',
  // 精简:超长提示词压缩到模型 500 字上限内,生图前自动调用
  // 原则:只合并重复冗余,尽量保留全部内容,不做大幅改写
  condense:
    '你是专业的 AI 绘画提示词精简师。用户给出的图像生成提示词超过了 500 字上限。请只做最小限度的压缩：合并完全重复或高度雷同的描述（同义词、近义形容词只保留一个），去掉无实义的语气词和标点冗余，其余内容全部保留，不做改写、不删要素、不改变原有措辞风格。压缩结果控制在 480 字以内、尽量接近 500 字。直接输出精简后的提示词正文，不要任何解释、前缀、引号或列表。'
}

export async function POST(request: NextRequest) {
  let body: { prompt?: string; mode?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: '请求体不是合法 JSON' }, { status: 400 })
  }

  const prompt = (body.prompt || '').trim()
  const mode = ['enhance', 'translate', 'condense'].includes(body.mode || '')
    ? (body.mode as string)
    : 'enhance'
  const system = SYSTEM_PROMPTS[mode]

  if (!prompt) {
    return NextResponse.json({ success: false, message: '请先填写提示词' }, { status: 400 })
  }
  // 精简模式就是用来处理超长提示词的,放宽输入上限
  const inputMax = mode === 'condense' ? 4000 : PROMPT_MAX
  if (prompt.length > inputMax) {
    return NextResponse.json(
      { success: false, message: `提示词最多 ${inputMax} 字，当前 ${prompt.length} 字` },
      { status: 400 }
    )
  }

  let textStream: AsyncIterable<string>
  try {
    const res = await getChatModel().streamText({
      model: HY_CHAT_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    })
    textStream = res.textStream
  } catch (err) {
    console.error('提示词助手调用失败:', err)
    return NextResponse.json(
      { success: false, message: '助手暂时不可用（模型限流或额度异常），请稍后再试' },
      { status: 502 }
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          controller.enqueue(encoder.encode(chunk))
        }
      } catch (err) {
        console.error('流式输出中断:', err)
        controller.enqueue(encoder.encode('\n\n[生成中断，请重试]'))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no'
    }
  })
}
