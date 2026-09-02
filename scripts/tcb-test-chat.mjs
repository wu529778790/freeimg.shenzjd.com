// 验证:1) 生图返回的签名 URL 用 GET 是否可下载 2) 对话模型换个调用姿势再试
import tcb from '@cloudbase/node-sdk'

const app = tcb.init({
  env: process.env.TCB_ENV_ID,
  secretId: process.env.TCB_SECRET_ID,
  secretKey: process.env.TCB_SECRET_KEY,
  timeout: 120000
})

// 1. 生图 + GET 下载
const t0 = Date.now()
const imageModel = app.ai().createImageModel('hunyuan-image')
const res = await imageModel.generateImage({
  model: 'HY-Image-3.0-Plus-4090-Tob-v1.0',
  prompt: '一朵红色的玫瑰花,特写',
  size: '720x1280'
})
const url = res?.data?.[0]?.url
console.log(`生图 ${((Date.now() - t0) / 1000).toFixed(1)}s size=720x1280`)
const get = await fetch(url)
const buf = Buffer.from(await get.arrayBuffer())
console.log('GET 下载:', get.status, get.headers.get('content-type'), `${(buf.length / 1024).toFixed(0)}KB`)

// 2. 对话模型重试(隔几秒避免限流)
await new Promise((r) => setTimeout(r, 5000))
try {
  const model = app.ai().createModel('cloudbase')
  const r = await model.generateText({
    model: 'hy3',
    messages: [{ role: 'user', content: '回复"OK"两个字母即可' }]
  })
  console.log('对话返回:', JSON.stringify(r.choices?.[0]?.message || r).slice(0, 300))
} catch (err) {
  console.error('hy3 失败:', err.response?.status, err.response?.data || err.message, err.code || '')
  try {
    const model2 = app.ai().createModel('hunyuan-exp')
    const r2 = await model2.generateText({
      model: 'hunyuan-lite',
      messages: [{ role: 'user', content: '回复OK' }]
    })
    console.log('hunyuan-lite 返回:', JSON.stringify(r2.choices?.[0]?.message || r2).slice(0, 300))
  } catch (e2) {
    console.error('hunyuan-lite 也失败:', e2.response?.status, e2.response?.data || e2.message)
  }
}
