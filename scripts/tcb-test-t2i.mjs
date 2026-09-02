// 验证 CloudBase AI 生图链路:文生图 + 对话模型各调一次
// 用法: node --env-file=.env.local scripts/tcb-test-t2i.mjs
import tcb from '@cloudbase/node-sdk'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 120000
})

const t0 = Date.now()
try {
  const imageModel = app.ai().createImageModel('hunyuan-image')
  const res = await imageModel.generateImage({
    model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
    prompt: '一只橘色的猫趴在窗台上晒太阳,温暖阳光,摄影风格',
    size: '1024x1024'
  })
  console.log(`生图耗时 ${(Date.now() - t0) / 1000}s`)
  console.log('返回结构 keys:', Object.keys(res))
  const url = res?.url || res?.images?.[0]?.url || res?.data?.[0]?.url
  console.log('图片 URL:', url)
  if (url) {
    const head = await fetch(url, { method: 'HEAD' })
    console.log('URL 可访问:', head.status, head.headers.get('content-type'), head.headers.get('content-length'))
  }
  console.log('完整返回:', JSON.stringify(res).slice(0, 800))
} catch (err) {
  console.error('生图失败:', err.message || err)
  if (err.code) console.error('code:', err.code)
  process.exitCode = 1
}

const t1 = Date.now()
try {
  const model = app.ai().createModel('cloudbase')
  const result = await model.generateText({
    model: 'hy3',
    messages: [{ role: 'user', content: '用一句话介绍混元大模型' }]
  })
  console.log(`对话耗时 ${(Date.now() - t1) / 1000}s`)
  console.log('对话返回:', JSON.stringify(result).slice(0, 600))
} catch (err) {
  console.error('对话失败:', err.message || err)
  if (err.code) console.error('code:', err.code)
  process.exitCode = 1
}
